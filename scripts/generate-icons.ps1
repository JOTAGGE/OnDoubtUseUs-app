Add-Type -AssemblyName System.Drawing

$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

function Draw-OduuIcon {
    param(
        [float]$size,
        [string]$shape = "rounded", # "rounded", "circle", "foreground"
        [string]$outputPath
    )

    $intSize = [int]$size
    $bmp = [System.Drawing.Bitmap]::new($intSize, $intSize)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $blueColor = [System.Drawing.Color]::FromArgb(255, 23, 73, 232) # #1749e8 ODUU brand blue
    $whiteColor = [System.Drawing.Color]::White

    $blueBrush = [System.Drawing.SolidBrush]::new($blueColor)
    $whiteBrush = [System.Drawing.SolidBrush]::new($whiteColor)

    if ($shape -eq "rounded") {
        # Rounded rectangle
        $corner = [float]($size * 0.22)
        $rect = [System.Drawing.RectangleF]::new(0.0, 0.0, [float]$size, [float]$size)
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddArc($rect.X, $rect.Y, $corner * 2, $corner * 2, 180, 90)
        $path.AddArc($rect.Right - ($corner * 2), $rect.Y, $corner * 2, $corner * 2, 270, 90)
        $path.AddArc($rect.Right - ($corner * 2), $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 90, 90)
        $path.CloseFigure()
        $g.FillPath($blueBrush, $path)
        $path.Dispose()

        # Smiley eyes
        $eyeR = [float]($size * 0.075)
        $eyeY = [float]($size * 0.35)
        $eye1X = [float]($size * 0.36 - $eyeR)
        $eye2X = [float]($size * 0.64 - $eyeR)
        $g.FillEllipse($whiteBrush, $eye1X, $eyeY, $eyeR * 2, $eyeR * 2)
        $g.FillEllipse($whiteBrush, $eye2X, $eyeY, $eyeR * 2, $eyeR * 2)

        # Smile curve
        $penWidth = [float][Math]::Max(2.5, $size * 0.08)
        $pen = [System.Drawing.Pen]::new($whiteColor, $penWidth)
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

        $arcRect = [System.Drawing.RectangleF]::new([float]($size * 0.26), [float]($size * 0.34), [float]($size * 0.48), [float]($size * 0.38))
        $g.DrawArc($pen, $arcRect, [float]20, [float]140)
        $pen.Dispose()
    }
    elseif ($shape -eq "circle") {
        # Circle
        $g.FillEllipse($blueBrush, [float]0, [float]0, [float]$size, [float]$size)

        # Smiley eyes
        $eyeR = [float]($size * 0.075)
        $eyeY = [float]($size * 0.35)
        $eye1X = [float]($size * 0.36 - $eyeR)
        $eye2X = [float]($size * 0.64 - $eyeR)
        $g.FillEllipse($whiteBrush, $eye1X, $eyeY, $eyeR * 2, $eyeR * 2)
        $g.FillEllipse($whiteBrush, $eye2X, $eyeY, $eyeR * 2, $eyeR * 2)

        # Smile curve
        $penWidth = [float][Math]::Max(2.5, $size * 0.08)
        $pen = [System.Drawing.Pen]::new($whiteColor, $penWidth)
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

        $arcRect = [System.Drawing.RectangleF]::new([float]($size * 0.26), [float]($size * 0.34), [float]($size * 0.48), [float]($size * 0.38))
        $g.DrawArc($pen, $arcRect, [float]20, [float]140)
        $pen.Dispose()
    }
    elseif ($shape -eq "foreground") {
        # Foreground inside 108x108 grid
        $badgeSize = [float]($size * 0.66)
        $offset = [float](($size - $badgeSize) / 2.0)
        $corner = [float]($badgeSize * 0.24)

        $rect = [System.Drawing.RectangleF]::new($offset, $offset, $badgeSize, $badgeSize)
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddArc($rect.X, $rect.Y, $corner * 2, $corner * 2, 180, 90)
        $path.AddArc($rect.Right - ($corner * 2), $rect.Y, $corner * 2, $corner * 2, 270, 90)
        $path.AddArc($rect.Right - ($corner * 2), $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 0, 90)
        $path.AddArc($rect.X, $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 90, 90)
        $path.CloseFigure()
        $g.FillPath($blueBrush, $path)
        $path.Dispose()

        # Smiley inside badge
        $eyeR = [float]($badgeSize * 0.075)
        $eyeY = [float]($offset + ($badgeSize * 0.35))
        $eye1X = [float]($offset + ($badgeSize * 0.36) - $eyeR)
        $eye2X = [float]($offset + ($badgeSize * 0.64) - $eyeR)
        $g.FillEllipse($whiteBrush, $eye1X, $eyeY, $eyeR * 2, $eyeR * 2)
        $g.FillEllipse($whiteBrush, $eye2X, $eyeY, $eyeR * 2, $eyeR * 2)

        # Smile curve
        $penWidth = [float][Math]::Max(2.5, $badgeSize * 0.08)
        $pen = [System.Drawing.Pen]::new($whiteColor, $penWidth)
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

        $arcRect = [System.Drawing.RectangleF]::new([float]($offset + ($badgeSize * 0.26)), [float]($offset + ($badgeSize * 0.34)), [float]($badgeSize * 0.48), [float]($badgeSize * 0.38))
        $g.DrawArc($pen, $arcRect, [float]20, [float]140)
        $pen.Dispose()
    }

    $blueBrush.Dispose()
    $whiteBrush.Dispose()
    $g.Dispose()

    $parent = Split-Path -Parent $outputPath
    if (!(Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated: $outputPath"
}

# Generate mipmap sizes
$densities = @{
    "mipmap-mdpi" = @{ icon = 48; fg = 108 }
    "mipmap-hdpi" = @{ icon = 72; fg = 162 }
    "mipmap-xhdpi" = @{ icon = 96; fg = 216 }
    "mipmap-xxhdpi" = @{ icon = 144; fg = 324 }
    "mipmap-xxxhdpi" = @{ icon = 192; fg = 432 }
}

foreach ($folder in $densities.Keys) {
    $d = $densities[$folder]
    $folderPath = Join-Path $resDir $folder
    Draw-OduuIcon -size $d.icon -shape "rounded" -outputPath (Join-Path $folderPath "ic_launcher.png")
    Draw-OduuIcon -size $d.icon -shape "circle" -outputPath (Join-Path $folderPath "ic_launcher_round.png")
    Draw-OduuIcon -size $d.fg -shape "foreground" -outputPath (Join-Path $folderPath "ic_launcher_foreground.png")
}

# Also generate 512x512 root icon.png
$rootIconPath = Join-Path $PSScriptRoot "..\icon.png"
Draw-OduuIcon -size 512 -shape "rounded" -outputPath $rootIconPath

# Also generate splash icon for drawables
function Draw-OduuSplash {
    param(
        [int]$width,
        [int]$height,
        [string]$outputPath
    )

    $bmp = [System.Drawing.Bitmap]::new($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 10, 10)) # #0a0a0a dark background

    # Center badge
    $badgeSize = [Math]::Min($width, $height) * 0.30
    $offsetW = ($width - $badgeSize) / 2.0
    $offsetH = ($height - $badgeSize) / 2.0
    $corner = $badgeSize * 0.22

    $blueColor = [System.Drawing.Color]::FromArgb(255, 23, 73, 232)
    $whiteColor = [System.Drawing.Color]::White
    $blueBrush = [System.Drawing.SolidBrush]::new($blueColor)
    $whiteBrush = [System.Drawing.SolidBrush]::new($whiteColor)

    $rect = [System.Drawing.RectangleF]::new([float]$offsetW, [float]$offsetH, [float]$badgeSize, [float]$badgeSize)
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($rect.X, $rect.Y, $corner * 2, $corner * 2, 180, 90)
    $path.AddArc($rect.Right - ($corner * 2), $rect.Y, $corner * 2, $corner * 2, 270, 90)
    $path.AddArc($rect.Right - ($corner * 2), $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - ($corner * 2), $corner * 2, $corner * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($blueBrush, $path)
    $path.Dispose()

    # Smiley eyes
    $eyeR = [float]($badgeSize * 0.075)
    $eyeY = [float]($offsetH + ($badgeSize * 0.35))
    $eye1X = [float]($offsetW + ($badgeSize * 0.36) - $eyeR)
    $eye2X = [float]($offsetW + ($badgeSize * 0.64) - $eyeR)
    $g.FillEllipse($whiteBrush, $eye1X, $eyeY, $eyeR * 2, $eyeR * 2)
    $g.FillEllipse($whiteBrush, $eye2X, $eyeY, $eyeR * 2, $eyeR * 2)

    # Smile curve
    $penWidth = [float][Math]::Max(2.5, $badgeSize * 0.08)
    $pen = [System.Drawing.Pen]::new($whiteColor, $penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $arcRect = [System.Drawing.RectangleF]::new([float]($offsetW + ($badgeSize * 0.26)), [float]($offsetH + ($badgeSize * 0.34)), [float]($badgeSize * 0.48), [float]($badgeSize * 0.38))
    $g.DrawArc($pen, $arcRect, [float]20, [float]140)
    $pen.Dispose()

    $blueBrush.Dispose()
    $whiteBrush.Dispose()
    $g.Dispose()

    $parent = Split-Path -Parent $outputPath
    if (!(Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated splash: $outputPath"
}

# Generate splash for drawable and drawable-land / drawable-port
Draw-OduuSplash -width 480 -height 800 -outputPath (Join-Path $resDir "drawable\splash.png")
Draw-OduuSplash -width 800 -height 480 -outputPath (Join-Path $resDir "drawable-land-mdpi\splash.png")
Draw-OduuSplash -width 1280 -height 720 -outputPath (Join-Path $resDir "drawable-land-hdpi\splash.png")
Draw-OduuSplash -width 1600 -height 960 -outputPath (Join-Path $resDir "drawable-land-xhdpi\splash.png")
Draw-OduuSplash -width 1920 -height 1080 -outputPath (Join-Path $resDir "drawable-land-xxhdpi\splash.png")
Draw-OduuSplash -width 2560 -height 1440 -outputPath (Join-Path $resDir "drawable-land-xxxhdpi\splash.png")

Draw-OduuSplash -width 480 -height 800 -outputPath (Join-Path $resDir "drawable-port-mdpi\splash.png")
Draw-OduuSplash -width 720 -height 1280 -outputPath (Join-Path $resDir "drawable-port-hdpi\splash.png")
Draw-OduuSplash -width 960 -height 1600 -outputPath (Join-Path $resDir "drawable-port-xhdpi\splash.png")
Draw-OduuSplash -width 1080 -height 1920 -outputPath (Join-Path $resDir "drawable-port-xxhdpi\splash.png")
Draw-OduuSplash -width 1440 -height 2560 -outputPath (Join-Path $resDir "drawable-port-xxxhdpi\splash.png")

Write-Host "All icons and splash screens generated successfully!"
