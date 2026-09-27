# Mäter Word-lathunden: för varje sida (<id>--<sida>) det största steget som ryms på en sida i Word.
# Provfilerna heter <id>--<sida>--<steg i procent>.docx och görs av src/pages/utskrift/word/[fil].docx.ts.
# Sidorna prövas med halvering bland stegen, så att Word öppnar några få filer per sida. Skriver en rad per sida:
# <id>--<sida>=<steg i procent>, eller =0 om inte ens det minsta steget ryms. Körs av scripts/lathund-word.mjs.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-provsidor.ps1 <mapp med provfilerna>
param([Parameter(Mandatory = $true)][string]$Mapp)
$ErrorActionPreference = 'Stop'
$grupper = @{}
foreach ($fil in Get-ChildItem -Path $Mapp -Filter '*.docx') {
  if ($fil.Name -match '^(.+--\d)--(\d+)\.docx$') {
    $nyckel = $Matches[1]
    if (-not $grupper.ContainsKey($nyckel)) { $grupper[$nyckel] = @() }
    $grupper[$nyckel] += [pscustomobject]@{ Steg = [int]$Matches[2]; Sokvag = $fil.FullName }
  }
}
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$sidor = {
  param($sokvag)
  $doc = $word.Documents.Open($sokvag, $false, $true)
  try { return $doc.ComputeStatistics(2) } finally { $doc.Close($false) }
}
try {
  foreach ($nyckel in ($grupper.Keys | Sort-Object)) {
    $steg = @($grupper[$nyckel] | Sort-Object Steg)
    $lag = 0; $hog = $steg.Count - 1; $bast = -1
    while ($lag -le $hog) {
      $mitt = [int][math]::Floor(($lag + $hog) / 2)
      if ((& $sidor $steg[$mitt].Sokvag) -le 1) { $bast = $mitt; $lag = $mitt + 1 } else { $hog = $mitt - 1 }
    }
    $varde = if ($bast -ge 0) { $steg[$bast].Steg } else { 0 }
    Write-Output ("{0}={1}" -f $nyckel, $varde)
  }
} finally {
  $word.Quit()
}
