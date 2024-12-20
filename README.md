# breakout-room

A fully-featured implementation of [@agree-able/room](https://github.com/agree-able/room) demonstrating secure peer-to-peer chat rooms with identity verification and signed receipts. 
Perfect for testing and studying how to build p2p agent to agent communication.

To how how you'd use it with actual agents, see the [20 questions bot](https://github.com/agree-able/20-questions-bot)

## Quick Start

```bash
npx breakout-room
```

Start a host

<p align="center">
  <img width="600" src="https://raw.githubusercontent.com/agree-able/.github/refs/heads/main/profile/assets/host.svg">
</p>

Join as a participant

<p align="center">
  <img width="600" src="https://raw.githubusercontent.com/agree-able/.github/refs/heads/main/profile/assets/participant.svg">
</p>


The CLI includes an interactive menu system that guides you through all available options and configurations.

## Usage Modes

Command-line switches are available to reduce the amount of interactive menu choices. You can provide enough to start the app automatically.

### 1. Start a Room Manager
Create a hub for hosting multiple rooms with configurable:
- Room purpose and rules
- Identity verification requirements (Keybase integration)
- Automatic or manual participant validation
- Persistent configuration via JSON

Example starting a room manager:
```bash
npx breakout-room --mode=roomManager --reason="Code Review Sessions" --rules="Professional conduct"
```

### 2. Join an Existing Room
Connect to an existing room using one of these methods:
- **agreeableKey**: A reusable connection key with room entry requirements
- **domain**: Lookup room details via DNS TXT record
- **invite**: One-time invite code

Example joining with domain:
```bash
npx breakout-room --mode=join --domain=example.com --hostProveWhoami=true --agree=true --autoValidate=true
```

 - **hostProveWhoami** the host will show their keybase username and domain ownership (if available)
 - **autoValidate** if the host proves username and and domain, dont prompt to enter room
 - **agree** just agree to both the reason and rules of the room

### 3. Simple Room
Quick setup for basic chat functionality without advanced features.

## DNS Integration

When running a room manager, you'll receive an `agreeableKey`. To allow easy discovery, add it to your domain's DNS:

1. Create a TXT record for: `_breakoutroom.yourdomain.com`
2. Set the value to: `key=YOUR_AGREEABLE_KEY`

Users can then connect using just your domain:
```bash
npx breakout-room --domain=yourdomain.com
```

## Keybase Verification

Keybase integration provides cryptographic identity verification. To use this feature, you need:

1. A Keybase account with:
   - An active username
   - A PGP key added to your verification chain
   - Access to your private key for message signing
   - Your public key accessible at: https://keybase.io/USERNAME/pgp_keys.asc

2. For room hosts:
   - Verify domain ownership through Keybase's DNS TXT verification method
   - This allows participants to cryptographically verify both your identity and domain control

The verification process happens automatically when enabled, ensuring secure identity verification without manual steps.

## Configuration

The CLI's menu system helps discover and configure all options including:
- Room purpose and rules
- Identity verification (Keybase)
- Participant validation
- Connection methods
- Persistent settings

Save configurations to reuse:
```bash
npx breakout-room --config=myroom.json
```

## Examples
- [Basic CLI Implementation](cli.mjs)
- [20 questions bot](https://github.com/agree-able/20-questions-bot) Example of its intended bot friendly integration

## Security Features
- Keybase identity verification
- Domain ownership validation
- Configurable entry requirements
- Participant agreement tracking


