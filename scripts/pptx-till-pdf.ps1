# Gör en pdf av en pptx eller odp med PowerPoint (COM), så att lathundens sidor kan läsas som
# bilder. Sedan: pdftoppm -r 80 -png lathund.pdf sida  (Poppler) ger en png per sida.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pptx-till-pdf.ps1 underlag/metoder/<leverans>/lathund.pptx
#
# Pdf:en hamnar bredvid källfilen med samma namn. Kräver att PowerPoint är installerat.
param([Parameter(Mandatory = $true)][string]$Fil)
$ErrorActionPreference = 'Stop'
$kalla = (Resolve-Path $Fil).Path
$ut = [System.IO.Path]::ChangeExtension($kalla, '.pdf')
$pp = New-Object -ComObject PowerPoint.Application
try {
  $pres = $pp.Presentations.Open($kalla, $true, $false, $false)  # ReadOnly, Untitled, WithWindow
  $pres.SaveAs($ut, 32)  # ppSaveAsPDF
  $pres.Close()
  Write-Output "pdf: $ut"
} finally {
  $pp.Quit()
}
