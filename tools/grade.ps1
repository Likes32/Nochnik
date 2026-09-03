# Приводит кадры к единому ночному грейду и впекает его в JPEG.
# Грейд именно запекается, а не вешается CSS-фильтром: фильтр на
# полноэкранном фото заставляет iOS гонять шейдер на каждой прокрутке.
#
#   powershell -ExecutionPolicy Bypass -File tools\grade.ps1

Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$photos  = Join-Path $root "photos"
$maxSide = 1600
$quality = 82

# Насыщенность и цветовой сдвиг. Сдержанно: задача — согласовать
# кадры между собой, а не перекрасить их.
$s        = 0.86    # насыщенность
$bright   = 0.94    # общая яркость
$gainR    = 1.05
$gainG    = 1.00
$gainB    = 0.93

$lr = 0.299; $lg = 0.587; $lb = 0.114

# В PowerShell 5.1 конструктор ColorMatrix не принимает [single[][]] через
# New-Object — валится. Создаём единичную и присваиваем поля по одному.
$cm = New-Object System.Drawing.Imaging.ColorMatrix
$cm.Matrix00 = ($lr + $s * (1 - $lr)) * $gainR * $bright
$cm.Matrix01 = ($lr * (1 - $s))       * $gainG * $bright
$cm.Matrix02 = ($lr * (1 - $s))       * $gainB * $bright
$cm.Matrix10 = ($lg * (1 - $s))       * $gainR * $bright
$cm.Matrix11 = ($lg + $s * (1 - $lg)) * $gainG * $bright
$cm.Matrix12 = ($lg * (1 - $s))       * $gainB * $bright
$cm.Matrix20 = ($lb * (1 - $s))       * $gainR * $bright
$cm.Matrix21 = ($lb * (1 - $s))       * $gainG * $bright
$cm.Matrix22 = ($lb + $s * (1 - $lb)) * $gainB * $bright
$cm.Matrix33 = 1.0
$cm.Matrix44 = 1.0

$attr = New-Object System.Drawing.Imaging.ImageAttributes
$attr.SetColorMatrix($cm)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

$total = 0
foreach ($file in Get-ChildItem $photos -Filter *.jpg) {
    $src = [System.Drawing.Image]::FromFile($file.FullName)

    $scale = [Math]::Min(1.0, $maxSide / [Math]::Max($src.Width, $src.Height))
    $w = [int][Math]::Round($src.Width  * $scale)
    $h = [int][Math]::Round($src.Height * $scale)

    $dst = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $g.DrawImage($src, $rect, 0, 0, $src.Width, $src.Height,
                 [System.Drawing.GraphicsUnit]::Pixel, $attr)

    $g.Dispose()
    $srcW = $src.Width; $srcH = $src.Height
    $src.Dispose()

    $tmp = "$($file.FullName).tmp"
    $dst.Save($tmp, $codec, $encParams)
    $dst.Dispose()

    Move-Item -Force $tmp $file.FullName
    $kb = [Math]::Round((Get-Item $file.FullName).Length / 1KB)
    $total += $kb
    "{0,-16} {1}x{2} -> {3}x{4}  {5} КБ" -f $file.Name, $srcW, $srcH, $w, $h, $kb
}

"", ("Суммарно: {0:N1} МБ" -f ($total / 1024))
