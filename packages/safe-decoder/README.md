# @cinaconnect/safe-decoder

Safe{Core} transaction decoder for CinaConnect.

## Installation

This is a Rust binary package. Clone the repo and build:

```bash
cd packages/safe-decoder
cargo build --release
```

## Usage

```bash
./target/release/safe-decoder <encoded-data>
```

## Description

Decodes Safe multi-signature transaction calldata for human-readable inspection.
