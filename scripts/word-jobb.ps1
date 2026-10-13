# Flera Word-filer i en Word-körning: Word sparar var och en som pdf, med Word-filens bokmärken som pdf:ens disposition.
# scripts/bankpdf.mjs skriver jobben till en json-fil och läser svaret ur en annan. Bokmärkena (sida_0, sida_1 …) står där
# en ram eller ett blad börjar (sidkartan i src/lib/metoddocx.ts), och scripts/pdfkarta.py läser i pdf:en vilken sida de
# står på. En körning åt gången: skriptet startar Word och stänger det efteråt, så två samtidiga körningar stänger
# varandras Word (som wordparitets word-pdf.ps1).
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-jobb.ps1 <jobb.json> <svar.json>
#
# jobb.json: [{ "docx": "<fil>", "pdf": "<fil>" }, ...]
# svar.json: [{ "docx": "<fil>", "fel": "<text, tom när det gick>" }, ...]
param(
  [Parameter(Mandatory = $true)][string]$Jobb,
  [Parameter(Mandatory = $true)][string]$Svar
)
$ErrorActionPreference = 'Stop'
$jobben = Get-Content -Raw -Encoding UTF8 $Jobb | ConvertFrom-Json
$svaren = New-Object System.Collections.ArrayList
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($j in $jobben) {
    $rad = [ordered]@{ docx = $j.docx; fel = '' }
    try {
      $doc = $word.Documents.Open($j.docx, $false, $true)
      try {
        # wdExportFormatPDF, utan att öppna, för utskrift, hela dokumentet, innehållet, med dokumentets egenskaper,
        # och med Word-filens bokmärken som disposition (wdExportCreateWordBookmarks = 2). Resten är Words förval.
        $doc.ExportAsFixedFormat($j.pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 2, $true, $true, $false)
      } finally {
        $doc.Close($false)
      }
    } catch {
      $rad.fel = $_.Exception.Message
    }
    [void]$svaren.Add([pscustomobject]$rad)
  }
} finally {
  $word.Quit()
}
ConvertTo-Json -InputObject @($svaren) -Depth 4 | Set-Content -Encoding UTF8 $Svar
Write-Output ("{0} filer" -f $svaren.Count)
