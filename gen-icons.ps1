Add-Type -AssemblyName System.Drawing
$sizes = @(192,512)
$transparent = [System.Drawing.Color]::FromArgb(0,0,0,0)
$emerald = [System.Drawing.Color]::FromArgb(255,16,185,129)

foreach($s in $sizes){
  $bmp = New-Object System.Drawing.Bitmap($s,$s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($transparent)
  $g.SmoothingMode = 'AntiAlias'
  $pen = [System.Drawing.Pen]::new($emerald,[float]($s*0.06))
  $g.DrawEllipse($pen,$s*0.07,$s*0.07,$s*0.86,$s*0.86)
  $brush = New-Object System.Drawing.SolidBrush($emerald)
  $g.FillEllipse($brush,$s*0.2,$s*0.2,$s*0.6,$s*0.6)
  $font = New-Object System.Drawing.Font('Arial', [float]($s*0.32), [System.Drawing.FontStyle]::Bold)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'
  $format.LineAlignment = 'Center'
  $g.DrawString('G',$font,[System.Drawing.Brushes]::White,$s/2,$s/2,$format)
  $out = "C:\Users\migue\Downloads\GYM\GymTracker\public\icons\icon-$s.png"
  $bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose();
}
