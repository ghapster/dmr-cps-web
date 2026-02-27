# Anytone D578UV RDT File Section Map

File: `DMR Radio FEQ List.rdt` (32,194 bytes / 0x7DC2)
Firmware: V1039, CPS V110, Model D578UV

## Parsed Sections (round-trip verified)

| Offset | End | Size | Section |
|--------|-----|------|---------|
| 0x0000 | 0x0016 | 23 | **File Header** — "V1039", payload size, "D578UV", "V110" |
| 0x0017 | 0x01D3 | 445 | **Settings Block** — general settings, preserved verbatim |
| 0x01D4 | 0x01D5 | 2 | **Channel Count** (uint16_le) = 143 |
| 0x01D6 | 0x316E | ~12,185 | **Channel Records** — 143 variable-length records |
| 0x316F | 0x316F | 1 | **Radio ID Count** (uint8) = 1 |
| 0x3170 | 0x317B | 12 | **Radio ID Records** — 1 record: DMR ID 3190119 / KB1CAD |
| 0x317C | 0x317C | 1 | **Zone Count** (uint8) = 11 |
| 0x317D | 0x333D | 449 | **Zone Records** — 11 zones |
| 0x333E | 0x333E | 1 | **Scan List Count** (uint8) = 6 |
| 0x333F | 0x3491 | 339 | **Scan List Records** — 6 lists, corrected format |
| 0x3492 | 0x3492 | 1 | **DTMF Contact Count** (uint8) = 1 |
| 0x3493 | 0x34A2 | 16 | **DTMF Contact Records** — 1 entry: "12345" / "Contact1" |

## Trailing Sections (preserved as raw bytes, structure identified)

| Offset | End | Size | Section | Notes |
|--------|-----|------|---------|-------|
| 0x34A3 | 0x34A4 | 2 | **Digital Contacts Size** (uint16_le) = 618 | Section size field |
| 0x34A5 | 0x370E | 618 | **Digital Contacts Data** | 32 contacts, variable-length encoded records. Each has: pre-bytes(3) + idx(1) + 0x00(1) + callType(1: 0x10=group, 0x00=private) + encoded_data(7-13 bytes) + trailing_zeros |
| 0x370F | 0x3716 | 8 | **Text Message Header** | Unknown format, includes byte at +8 = count |
| 0x3717 | 0x3752 | 60 | **Text Messages** | 5 messages: count(1) + entries of idx(1) + text(null-term). Messages: "Hello!", "Welcome!", "Thank you!", "Good bye!", "Happy every day!" |
| 0x3753 | 0x3755 | 3 | **Group List Header** | Unknown bytes before group list |
| 0x3756 | 0x3759 | 4 | **Group List Settings** | `30 2a 64 00` |
| 0x375A | 0x375D | 4 | **Group List Settings 2** | `30 2a 01 00` |
| 0x375E | 0x376E | 17 | **Group List Name + Header** | "Group List 1" + count/flags |
| 0x376F | 0x380E | 160 | **Group List Entries** | 32 entries × 5 bytes each (contact_idx + refs) |
| 0x380F | 0x385B | 77 | **Unknown Config Block** | Possibly VFO/display/misc settings. Contains some non-zero values mixed with zeros |
| 0x385C | 0x38CD | 114 | **APRS Settings** | GPS message text ("My current GPS position is"), APRS callsigns ("APAT51", "BG6LKK"), paths ("WIDE1-1", "WIDE2-1"), comment ("/&APRSCN WIFI 4.30V"), config bytes |
| 0x38CE | 0x3929 | 92 | **Roaming Channels** | 4 channels: "Roaming CH 1-4", each with name(null-term) + index(1) + padding(1) + freq_data(~6 bytes) |
| 0x392A | 0x3951 | 40 | **Roaming Zones** | 1 zone: "ROAM ZONE 1" with 4 channel refs + config |
| 0x3952 | 0x3979 | 40 | **Post-Roaming Config** | Small non-zero data block |
| 0x397A | 0x3A64 | 235 | **Zero Padding** | |
| 0x3A65 | 0x3B4D | 233 | **Sparse Config Data** | Scattered non-zero bytes with large zero gaps |
| 0x3B4E | 0x7CC9 | 16,764 | **Reserved Space** | All zeros — reserved for expansion |
| 0x7CCA | 0x7D0B | 66 | **Unknown Config Block 2** | Non-zero data, purpose unknown |
| 0x7D0C | 0x7DBC | 177 | **Zero Padding** | |
| 0x7DBD | 0x7DC1 | 5 | **File Footer** | "V1039" |

## Scan List Record Format (verified)

```
index(1) + name(1-16, null-terminated if <16) + settings(7) + timing(4) + count(1) + entries(count × 3)
```

Each entry: `flag(1) + channel_index(uint16_le)`

## DTMF Contact Record Format (verified)

```
index(1) + code_length(1) + code(code_length bytes ASCII) + name(1-16, null-terminated if <16)
```

## Channel Record Format (verified)

```
Total size = 0x30 + nameFieldSize(nameLen) + 0x1A
```

Key fields at offsets: index(0x00, uint16_le), rx_freq(0x02, uint32_le/100000), repeater_mode(0x06), tx_offset(0x07, uint32_le/100000), mode(0x0B), power(0x0C), bandwidth(0x0D), rx_only(0x0F), admit(0x20), color_code(0x28), time_slot(0x2A), name(0x30, var), trailing_data(+name, 0x1A bytes).
