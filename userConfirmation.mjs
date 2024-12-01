import { text, confirm, select, log, note } from '@clack/prompts'
import pc from 'picocolors'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import  z32  from 'z32'

const joinRoomValidate = async (config) => {
  const { invite, agreeableKey, domain } = config
  // need one of these
  if (!invite && !agreeableKey && !domain) {
    const howToConnect = await select({
      message: 'how to bootstrap peer connection?',
      options: [
        { value: 'agreeableKey', label: 'use an agreeableKey', hint: 'reusable, but has room entry requirements' },
        { value: 'domain', lable: 'use a domain txt lookup to find agreeableKey' },
        { value: 'invite', label: 'use a one time invite code' }
      ]
    })
    const value = await text({
      message: `Please enter the ${howToConnect}`,
      initialValue: '',
      validate (value) {
        if (value.length === 0) return 'Value is required!'
      }
    })
    config[howToConnect] = value
  }
  if (!invite) {
    config.hostProveWhoami = config.hostProveWhoami || await confirm({
      message: 'Do you want to verify the host\'s identity?'
    })
  }
}

const startRoomManagerValidate = async (config) => {
  config.reason = config.reason || await text({
    message: 'What is the purpose of this room?',
    placeholder: 'Example: Collaborative code review session',
    initialValue: '',
    validate (value) {
      if (value.length === 0) return 'Value is required!'
    }
  })
  config.rules = config.rules || await text({
    message: 'Please specify the room guidelines and expectations:',
    placeholder: 'Example: Professional conduct, stay on topic',
    initialValue: '',
    validate (value) {
      if (value.length === 0) return 'Value is required!'
    }
  })
  const useKeybase = (config.keybaseUsername && (config.privateKeyArmoredFile || config.privateKeyArmored)) || await confirm({
    message: 'Allow participants to verifiy who the room host is with Keybase?'
  })
  
  if (useKeybase) {
    config.keybaseUsername = config.keybaseUsername || await text({
      message: 'Please enter your Keybase username for identity verification:',
      validate (value) {
        if (value.length === 0) return 'Value is required!'
      }
    })

    if (!config.privateKeyArmored && !config.privateKeyArmoredFile) {
      const privateKeyArmoredLocation = await select({
        message: 'Select how to provide your PGP private key for local verification:',
        options: [
          { value: 'file', label: 'Select a file' },
          { value: 'paste', label: 'Paste it in' }
        ]
      })

      if (privateKeyArmoredLocation === 'file') {
        config.privateKeyArmoredFile = await text({
          message: 'Enter the path to your PGP private key file',
          placeholder: '~/keys/private.key',
          validate (value) {
            if (value.length === 0) return 'Value is required!'
            const expandedPath = expandTilde(value)
            if (!fs.existsSync(expandedPath)) {
              return 'File does not exist!'
            }
            try {
              const content = fs.readFileSync(expandedPath, 'utf8')
              if (!looksLikePGPPrivateKey(content)) {
                return 'File does not appear to be a PGP private key!'
              }
            } catch (err) {
              return 'Unable to read file!'
            }
          }
        })
      } else if (privateKeyArmoredLocation === 'paste') {
        config.privateKeyArmored = await text({
          message: 'Paste your PGP private key',
          validate (value) {
            if (value.length === 0) return 'Value is required!'
            if (!looksLikePGPPrivateKey(value)) {
              return 'Text does not appear to be a PGP private key!'
            }
          }
        })
      }
    }
  }

  if (config.autoValidate === undefined) {
    config.autoValidate = await confirm({
      message: 'Do you want to automatically validate participants?'
    })
  }
  if (config.whoamiRequired === undefined) {
    config.whoamiRequired = await confirm({
      message: 'Require Keybase identity verification for participants?'
    })
  }

  if (config.seed) {
    note(`Using existing seed starting with: ${config.seed.substring(0, 6)}`, 'Configuration')
  } else {
    // Generate random seed
    const seed = crypto.randomBytes(32)
    config.seed = z32.encode(seed)
  }

  // Handle config file storage
  if (!config.config) {
    const saveConfig = await confirm({
      message: 'Would you like to save all settings to a config file for next time?'
    })

    if (saveConfig) {
      config.config = await text({
        message: 'Enter the path for the config file',
        placeholder: '~/myroom-config.json',
        validate(value) {
          if (!value.endsWith('.json')) return 'File must have .json extension!'
          return
        }
      })
    }
  }

  if (config.config) {
    const configPath = expandTilde(config.config)
    const configData = {
      mode: config.mode,
      seed: config.seed,
      reason: config.reason,
      rules: config.rules,
      autoValidate: config.autoValidate,
      whoamiRequired: config.whoamiRequired
    }
    
    // Add keybase config if present
    if (config.keybaseUsername) {
      configData.keybaseUsername = config.keybaseUsername
      if (config.privateKeyArmoredFile) {
        configData.privateKeyArmoredFile = config.privateKeyArmoredFile
      }
      if (config.privateKeyArmored) {
        configData.privateKeyArmored = config.privateKeyArmored
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2))
    note(`Settings saved to: ${configPath}`, 'Configuration')
    note(`Start app next time with: --config=${configPath}`, 'Next Steps')
  }

}

const simpleRoomValidate = async (config) => {

}

export const validateAndUpdateConfig = async (config) => {
  config.mode = config.mode || await select({
    message: 'What are you trying to do?',
    options: [
      { value: 'join', label: 'Join an existing room' },
      { value: 'roomManager', label: 'Start a room manager', hint: 'host many rooms/connections' },
      { value: 'room', label: 'Start a simple room' }
    ]
  })
  if (config.mode === 'join') return await joinRoomValidate(config)
  if (config.mode === 'roomManager') return await startRoomManagerValidate(config)
  return await simpleRoomValidate(config)
}

export const confirmRoomEnter = async (config, expectations, hostInfo) => {
  // Show host identity verification if requested
  if (config.hostProveWhoami && hostInfo?.whoami?.keybase) {
    const verified = hostInfo.whoami.keybase.verified
    note(
      `Username: ${pc.bold(hostInfo.whoami.keybase.username)}\n` +
      `Verification: ${verified ? pc.green('✓ Verified') : pc.red('✗ Unverified')}`,
      'Host Keybase Identity'
    )
    const continueAnyway = await confirm({
      message: 'Continue to enter room?'
    })
    if (!continueAnyway) {
      return { rules: false, reason: false }
    }
  }
  log.step(`${pc.bgGreen(pc.black('Room Entry Agreement Required'))}`)
  // log.info(`${pc.bold('room reason:')} ${pc.dim(expectations.reason)}`)
  note(expectations.reason, 'room reason')
  const reason = await confirm({
    message: 'Do you accept the stated purpose of this room?'
  })
  // log.step(`${pc.bold('room rules:')} ${pc.dim(expectations.rules)}`)
  note(expectations.rules, 'room rules')

  const rules = await confirm({
    message: 'Do you agree to follow these room guidelines?'
  })

  if (expectations.whoamiRequired) {
    if (!config.keybaseUsername) {
      config.keybaseUsername = await text({
        message: 'Please enter your Keybase username for identity verification:',
        validate (value) {
          if (value.length === 0) return 'Value is required!'
        }
      })
    }
    if (!config.privateKeyArmored && !config.privateKeyArmoredFile) {
      const privateKeyArmoredLocation = await select({
        message: 'Select how to provide your PGP private key for local verification:',
        options: [
          { value: 'file', label: 'Select a file' },
          { value: 'paste', label: 'Paste it in' }
        ]
      })

      if (privateKeyArmoredLocation === 'file') {
        config.privateKeyArmoredFile = await text({
          message: 'Enter the path to your PGP private key file',
          placeholder: '~/keys/private.key',
          validate (value) {
            if (value.length === 0) return 'Value is required!'
            const expandedPath = expandTilde(value)
            if (!fs.existsSync(expandedPath)) {
              return 'File does not exist!'
            }
            try {
              const content = fs.readFileSync(expandedPath, 'utf8')
              if (!looksLikePGPPrivateKey(content)) {
                return 'File does not appear to be a PGP private key!'
              }
            } catch (err) {
              return 'Unable to read file!'
            }
          }
        })
      } else if (privateKeyArmoredLocation === 'paste') {
        config.privateKeyArmored = await text({
          message: 'Paste your PGP private key',
          validate (value) {
            if (value.length === 0) return 'Value is required!'
            if (!looksLikePGPPrivateKey(value)) {
              return 'Text does not appear to be a PGP private key!'
            }
          }
        })
      }
    }
  }

  return { rules, reason }
}

export const validateParticipant = async (config, acceptance, extraInfo) => {
  // Show what the participant agreed to
  log.step(`${pc.bgGreen(pc.black('Participant Agreement Status:'))}`)
  note(
    `Room Reason: ${acceptance.reason ? pc.green('✓ Agreed') : pc.red('✗ Declined')}\n` +
    `Room Rules: ${acceptance.rules ? pc.green('✓ Agreed') : pc.red('✗ Declined')}`,
    'Agreements'
  )

  // If whoami verification was required, show the verification status
  if (extraInfo?.whoami?.keybase) {
    const verified = extraInfo.whoami.keybase.verified
    note(
      `Username: ${pc.bold(extraInfo.whoami.keybase.username)}\n` +
      `Verification: ${verified ? pc.green('✓ Verified') : pc.red('✗ Unverified')}`,
      'Keybase Identity'
    )
  }

  if (config.autoValidate) {
    // Auto-reject if they didn't accept rules or reason
    if (!acceptance.reason || !acceptance.rules) {
      return { ok: false }
    }
    // Auto-reject if whoami required but verification failed
    if (config.whoamiRequired && extraInfo?.whoami?.keybase && !extraInfo.whoami.keybase.verified) {
      return { ok: false }
    }
    return { ok: true }
  }

  const ok = await confirm({
    message: 'Allow the participant to enter?'
  })
  return { ok }
}

function looksLikePGPPrivateKey (text) {
  const pgpHeader = '-----BEGIN PGP PRIVATE KEY BLOCK-----'
  const pgpFooter = '-----END PGP PRIVATE KEY BLOCK-----'
  return text.includes(pgpHeader) && text.includes(pgpFooter)
}

function expandTilde (filePath) {
  if (filePath[0] === '~') {
    return path.join(os.homedir(), filePath.slice(1))
  }
  return filePath
}
