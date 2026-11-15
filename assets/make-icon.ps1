# Renders RAVEN app icon: rounded-square crop of RAVEN Logo.jpg -> icon.png (512) + icon.ico (multi-res)
Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot 'RAVEN Logo.jpg'
$png = Join-Path $PSScriptRoot 'icon.png'
$ico = Join-Path $PSScriptRoot 'icon.ico'

# Logo badge bounds measured from the source: x 260..1788, y ~228..1250 (content only, no wordmark)
$x = 260; $y = 228; $w = 1529; $h = 1023
$w = $h = [Math]::Min($w, $h)   # square, centred on the face
$x = 260 + [int]((1529 - $w) / 2)

$size = 1024
$radius = [int]($size * 0.22)

function New-RoundPath([int]$s, [int]$r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc(0, 0, $d, $d, 180, 90) | Out-Null
    $p.AddArc($s - $d, 0, $d, $d, 270, 90) | Out-Null
    $p.AddArc($s - $d, $s - $d, $d, $d, 0, 90) | Out-Null
    $p.AddArc(0, $s - $d, $d, $d, 90, 90) | Out-Null
    $p.CloseFigure()
    $p
}

$src0 = [System.Drawing.Image]::FromFile($src)
$master = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($master)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.Clear([System.Drawing.Color]::Transparent)

# vert gradient backdrop (sampled from logo: indigo top -> deep navy bottom)
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 0, $size),
    [System.Drawing.Color]::FromArgb(255, 57, 53, 104),
    [System.Drawing.Color]::FromArgb(255, 14, 15, 38))
$path = New-RoundPath $size $radius
$g.FillPath($bg, $path)

# clip to rounded square, then draw the raven face
$g.SetClip($path)
$dest = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$g.DrawImage($src0, $dest, (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$g.ResetClip()

# subtle inner border
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 190, 160, 255)), ([float]($size * 0.008))
$inset = [int]($size * 0.006)
$inner = New-RoundPath ($size - $inset * 2) ([int]($radius - $inset))
$g.TranslateTransform([float]$inset, [float]$inset)
$g.DrawPath($pen, $inner)
$g.ResetTransform()

$g.Dispose()
$src0.Dispose()

# PNG: 512 (Electron window/taskbar)
$pngBmp = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$pg = [System.Drawing.Graphics]::FromImage($pngBmp)
$pg.InterpolationMode = 'HighQualityBicubic'
$pg.Clear([System.Drawing.Color]::Transparent)
$pg.DrawImage($master, 0, 0, 512, 512)
$pg.Dispose()
$pngBmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBmp.Dispose()

# ICO: multi-resolution, PNG-compressed entries (Vista+)
$sizes = 16, 20, 24, 32, 40, 48, 64, 128, 256
$blobs = @()
foreach ($s in $sizes) {
    $b = New-Object System.Drawing.Bitmap $s, $s, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bg2 = [System.Drawing.Graphics]::FromImage($b)
    $bg2.InterpolationMode = 'HighQualityBicubic'
    $bg2.PixelOffsetMode = 'HighQuality'
    $bg2.Clear([System.Drawing.Color]::Transparent)
    $bg2.DrawImage($master, 0, 0, $s, $s)
    $bg2.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $blobs += , $ms.ToArray()
    $b.Dispose()
    $ms.Dispose()
}

$fs = [System.IO.File]::Create($ico)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0)              # reserved
$bw.Write([UInt16]1)              # type = icon
$bw.Write([UInt16]$sizes.Count)   # count
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $bw.Write([Byte]($(if ($s -ge 256) { 0 } else { $s })))  # width
    $bw.Write([Byte]($(if ($s -ge 256) { 0 } else { $s })))  # height
    $bw.Write([Byte]0)   # palette
    $bw.Write([Byte]0)   # reserved
    $bw.Write([UInt16]1) # planes
    $bw.Write([UInt16]32)# bitcount
    $bw.Write([UInt32]$blobs[$i].Length)
    $bw.Write([UInt32]$offset)
    $offset += $blobs[$i].Length
}
foreach ($blob in $blobs) { $bw.Write($blob) }
$bw.Flush(); $bw.Close(); $fs.Close()

$master.Dispose()
"icon.png + icon.ico written ($($sizes -join '/'))"
