# Exporterar en Word-fil till pdf med Word (COM), för att titta på sidorna som Word ritar dem
# (pdftoppm gör sedan bilder). Används i metodprovet när en Word-fil ska granskas sida för sida.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-pdf.ps1 <fil.docx> [<ut.pdf>]
#
# Utan andra argumentet hamnar pdf:en bredvid docx-filen. Skriver antalet sidor.
param(
  [Parameter(Mandatory = $true)][string]$Fil,
  [string]$Ut = ''
)
$ErrorActionPreference = 'Stop'
$kalla = (Resolve-Path $Fil).Path
if (-not $Ut) { $Ut = [System.IO.Path]::ChangeExtension($kalla, '.pdf') }
elseif (-not [System.IO.Path]::IsPathRooted($Ut)) { $Ut = Join-Path (Get-Location).Path $Ut }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($kalla, $false, $true)
  $doc.ExportAsFixedFormat($Ut, 17)  # wdExportFormatPDF
  $sidor = $doc.ComputeStatistics(2)  # wdStatisticPages
  $doc.Close($false)
  Write-Output ("{0}: {1} sidor -> {2}" -f (Split-Path $kalla -Leaf), $sidor, $Ut)
} finally {
  $word.Quit()
}
