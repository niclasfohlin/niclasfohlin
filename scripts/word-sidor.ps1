# Räknar sidor i Word-filer med Word (COM), utan att exportera något. Används för att kontrollera att
# en lathund är fyra sidor även i Word, inte bara fyra sektioner.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-sidor.ps1 dist/stodundervisning/*-lathund.docx
param([Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)][string[]]$Filer)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($monster in $Filer) {
    foreach ($fil in (Resolve-Path $monster)) {
      $doc = $word.Documents.Open($fil.Path, $false, $true)  # ConfirmConversions, ReadOnly
      $sidor = $doc.ComputeStatistics(2)  # wdStatisticPages
      $doc.Close($false)
      Write-Output ("{0}: {1} sidor" -f (Split-Path $fil.Path -Leaf), $sidor)
    }
  }
} finally {
  $word.Quit()
}
