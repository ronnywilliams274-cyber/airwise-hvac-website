# =====================================================================
#  AIRWISE HVAC: download Pexels photos & videos into assets\media
#  Run via DOWNLOAD-MEDIA.bat (Windows PowerShell 5.1+ / PowerShell 7)
#  Reads slots from assets\js\media-slots.js and the API key from
#  assets\js\config.js (or the PEXELS_API_KEY environment variable).
# =====================================================================
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }

$root      = Split-Path -Parent $PSScriptRoot
$cfgPath   = Join-Path $root 'assets\js\config.js'
$slotsPath = Join-Path $root 'assets\js\media-slots.js'
$outDir    = Join-Path $root 'assets\media'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

# ---- API key ----
$key = $env:PEXELS_API_KEY
if (-not $key) {
  $cfg = Get-Content $cfgPath -Raw
  $m = [regex]::Match($cfg, "pexelsApiKey\s*:\s*'([^']*)'")
  if ($m.Success) { $key = $m.Groups[1].Value }
}
if (-not $key) {
  Write-Host 'No Pexels API key found. Put it in assets\js\config.js (pexelsApiKey) or set PEXELS_API_KEY.' -ForegroundColor Red
  exit 1
}
$headers = @{ Authorization = $key }

# ---- slots (strict JSON between the outer braces) ----
$raw   = Get-Content $slotsPath -Raw
$start = $raw.IndexOf('{')
$end   = $raw.LastIndexOf('}')
$slots = $raw.Substring($start, $end - $start + 1) | ConvertFrom-Json

function Get-BestVideoFile($video, [int]$target) {
  $files = @($video.video_files | Where-Object { $_.link -and $_.width -and ("$($_.file_type)" -like '*mp4*') } | Sort-Object { [int]$_.width })
  if ($files.Count -eq 0) { return $null }
  $good = @($files | Where-Object { [int]$_.width -ge ($target * 0.7) })
  if ($good.Count -gt 0) { return $good[0] }
  return $files[$files.Count - 1]
}

$manifest = [ordered]@{}
$ok = 0; $failed = 0

foreach ($prop in $slots.PSObject.Properties) {
  $name = $prop.Name
  $slot = $prop.Value
  $isVideo = ($slot.type -eq 'video')
  Write-Host ''
  Write-Host ("-> {0} ({1})" -f $name, $slot.type) -ForegroundColor Cyan
  try {
    $item = $null
    if ($slot.id) {
      try {
        if ($isVideo) { $url = "https://api.pexels.com/videos/videos/$($slot.id)" } else { $url = "https://api.pexels.com/v1/photos/$($slot.id)" }
        $item = Invoke-RestMethod -Uri $url -Headers $headers
      } catch { Write-Host "   id $($slot.id) not available, falling back to search" -ForegroundColor DarkYellow }
    }
    if (-not $item -and $slot.query) {
      $q = [uri]::EscapeDataString([string]$slot.query)
      if ($isVideo) { $base = 'https://api.pexels.com/videos/search' } else { $base = 'https://api.pexels.com/v1/search' }
      $url = $base + '?query=' + $q + '&per_page=15'
      if ($slot.orientation) { $url = $url + '&orientation=' + $slot.orientation }
      $res = Invoke-RestMethod -Uri $url -Headers $headers
      if ($isVideo) { $arr = @($res.videos) } else { $arr = @($res.photos) }
      if ($isVideo) {
        $short = @($arr | Where-Object { $_.duration -ge 5 -and $_.duration -le 60 })
        if ($short.Count -gt 0) { $arr = $short }
      }
      $pick = 0
      if ($slot.pick) { $pick = [int]$slot.pick }
      if ($arr.Count -gt 0) { $item = $arr[[Math]::Min($pick, $arr.Count - 1)] }
    }
    if (-not $item) { throw 'nothing found' }

    if ($isVideo) {
      $target = 1280
      if ($slot.width) { $target = [int]$slot.width }
      $file = Get-BestVideoFile $item $target
      if (-not $file) { throw 'no mp4 file in this video' }
      $dest = Join-Path $outDir ($name + '.mp4')
      Write-Host ("   downloading {0}x{1} video..." -f $file.width, $file.height)
      Invoke-WebRequest -Uri $file.link -OutFile $dest -UseBasicParsing
      $posterRel = ''
      if ($item.image) {
        Invoke-WebRequest -Uri $item.image -OutFile (Join-Path $outDir ($name + '-poster.jpg')) -UseBasicParsing
        $posterRel = 'assets/media/' + $name + '-poster.jpg'
      }
      $manifest[$name] = [ordered]@{
        type   = 'video'
        src    = 'assets/media/' + $name + '.mp4'
        poster = $posterRel
        alt    = ''
        credit = [ordered]@{ kind = 'Video'; name = [string]$item.user.name; url = [string]$item.user.url; page = [string]$item.url }
      }
    } else {
      $w = 1900
      if ($slot.orientation -eq 'portrait') { $w = 1000 }
      $src = [string]$item.src.original + '?auto=compress&cs=tinysrgb&w=' + $w
      $dest = Join-Path $outDir ($name + '.jpg')
      Invoke-WebRequest -Uri $src -OutFile $dest -UseBasicParsing
      $manifest[$name] = [ordered]@{
        type   = 'photo'
        src    = 'assets/media/' + $name + '.jpg'
        poster = ''
        alt    = [string]$item.alt
        credit = [ordered]@{ kind = 'Photo'; name = [string]$item.photographer; url = [string]$item.photographer_url; page = [string]$item.url }
      }
    }
    $mb = [Math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host ("   saved {0} ({1} MB)" -f [IO.Path]::GetFileName($dest), $mb) -ForegroundColor Green
    $ok++
  } catch {
    Write-Host ("   skipped: {0}" -f $_.Exception.Message) -ForegroundColor Red
    $failed++
  }
}

$json = $manifest | ConvertTo-Json -Depth 6
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$js = "/* Generated by DOWNLOAD-MEDIA on $stamp. Set to null to go back to live Pexels loading. */`r`nwindow.AIRWISE_LOCAL_MEDIA = $json;`r`n"
[IO.File]::WriteAllText((Join-Path $outDir 'media-local.js'), $js, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host ("Done: {0} saved, {1} skipped. Media list written to assets\media\media-local.js" -f $ok, $failed) -ForegroundColor Green
Write-Host "Before publishing, set  pexelsApiKey: ''  in assets\js\config.js so your key stays private." -ForegroundColor Yellow
