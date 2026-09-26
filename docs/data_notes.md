# Data notes

## World Bank download (2026-09-26)
- 494,057 rows, all 129 indicators returned data (2000 onward).
- Timeouts on first attempt for 5 indicators; all succeeded on retry.
- Low-coverage indicators (<400 rows): EN.CLC.DRSK.XQ, SI.SPR.PC40.ZG, SI.SPR.PCAP.ZG,
  SL.FAM.0714.ZS, EN.CLC.MDAT.ZS, SL.TLF.0714.ZS, IE.PPI.WATR.CD, SI.RMT.COST.OB.ZS, SP.REG.BRTH.RU/UR.ZS
- Decision: keep them; the site hides sparklines when fewer than 3 points exist.