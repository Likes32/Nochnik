# Rebuilds the social preview card (1200x630) from the brand assets.
#
# Text lives in tools/og.json on purpose: PowerShell 5.1 reads a .ps1
# without a BOM as ANSI and mangles Cyrillic string literals. Reading
# the strings from a UTF-8 JSON file sidesteps that entirely.
#
#   powershell -ExecutionPolicy Bypass -File tools\og.ps1

Add-Type -AssemblyName System.Drawing

$root  = Split-Path -Parent $PSScriptRoot
$out   = Join-Path $root "assets\og.jpg"
$photo = Join-Path $root "photos\hero-wide.jpg"
$text  = Get-Content (Join-Path $PSScriptRoot "og.json") -Raw -Encoding UTF8 | ConvertFrom-Json

$W = 1200; $H = 630

# Brand palette, same values as css/tokens.css
$night  = [System.Drawing.ColorTranslator]::FromHtml("#0D130F")
$gold   = [System.Drawing.ColorTranslator]::FromHtml("#F0B54A")
$cream  = [System.Drawing.ColorTranslator]::FromHtml("#E8E3D6")
$olive  = [System.Drawing.ColorTranslator]::FromHtml("#8C9585")

# Real brand faces, not a system stand-in
$pfc = New-Object System.Drawing.Text.PrivateFontCollection
foreach ($f in @("cormorant.ttf", "onest.ttf", "mono.ttf")) {
    $p = Join-Path $PSScriptRoot "fonts-ttf\$f"
    if (Test-Path $p) { $pfc.AddFontFile($p) } else { throw "Missing font file: $p" }
}
$famDisplay = $pfc.Families | Where-Object { $_.Name -like "Cormorant*" } | Select-Object -First 1
$famBody    = $pfc.Families | Where-Object { $_.Name -like "Onest*" }     | Select-Object -First 1
$famMono    = $pfc.Families | Where-Object { $_.Name -like "JetBrains*" } | Select-Object -First 1

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$g.Clear($night)

# Photo, scaled to cover and pushed right so the house stays in frame
$src = [System.Drawing.Image]::FromFile($photo)
$scale = [Math]::Max($W / $src.Width, $H / $src.Height)
$dw = [int]($src.Width * $scale); $dh = [int]($src.Height * $scale)
$dx = [int](($W - $dw) * 0.72); $dy = [int](($H - $dh) * 0.58)
$g.DrawImage($src, $dx, $dy, $dw, $dh)
$src.Dispose()

# Same two-layer scrim as the hero: horizontal under the text, vertical at the foot
$rect = New-Object System.Drawing.Rectangle(0, 0, $W, $H)
$hor = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(238, 13, 19, 15),
    [System.Drawing.Color]::FromArgb(0, 13, 19, 15),
    [System.Drawing.Drawing2D.LinearGradientMode]::Horizontal)
$g.FillRectangle($hor, $rect)

$footRect = New-Object System.Drawing.Rectangle(0, ($H - 260), $W, 260)
$ver = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $footRect,
    [System.Drawing.Color]::FromArgb(0, 13, 19, 15),
    [System.Drawing.Color]::FromArgb(226, 13, 19, 15),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($ver, $footRect)

# Mark: the A-frame outline with its lit window, same geometry as the logo
$penMark = New-Object System.Drawing.Pen($cream, 4.5)
$penMark.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$mx = 72; $my = 66; $s = 0.46      # 96-unit logo grid, scaled
$pt = { param($x, $y) New-Object System.Drawing.PointF(($mx + $x * $s), ($my + $y * $s)) }
$tri = @((&$pt 48 11), (&$pt 87 81), (&$pt 9 81))
$g.DrawPolygon($penMark, [System.Drawing.PointF[]]$tri)
$win = New-Object System.Drawing.RectangleF(
    ($mx + 41 * $s), ($my + 57 * $s), (14 * $s), (24 * $s))
$g.FillRectangle((New-Object System.Drawing.SolidBrush($gold)), $win)

# Wordmark
$fBrand = New-Object System.Drawing.Font($famBody, 25, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$brandChars = $text.brand.ToCharArray()
$cx = 128.0
foreach ($ch in $brandChars) {
    $g.DrawString([string]$ch, $fBrand, (New-Object System.Drawing.SolidBrush($cream)), $cx, 70)
    $cx += $g.MeasureString([string]$ch, $fBrand).Width - 8 + 6   # manual tracking
}
$fDesc = New-Object System.Drawing.Font($famMono, 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString($text.descriptor, $fDesc, (New-Object System.Drawing.SolidBrush($olive)), 130, 104)

# Headline
$fHead = New-Object System.Drawing.Font($famDisplay, 74, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$y = 300
foreach ($line in $text.headline) {
    $g.DrawString($line, $fHead, (New-Object System.Drawing.SolidBrush($cream)), 66, $y)
    $y += 86
}

# Facts
$fFacts = New-Object System.Drawing.Font($famMono, 19, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString($text.facts, $fFacts, (New-Object System.Drawing.SolidBrush($gold)), 72, ($H - 96))

$g.Dispose()

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq "image/jpeg" }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]88)
$bmp.Save($out, $codec, $ep)
$bmp.Dispose()

"{0}  {1}x{2}  {3} KB" -f (Split-Path $out -Leaf), $W, $H, [Math]::Round((Get-Item $out).Length / 1KB)
