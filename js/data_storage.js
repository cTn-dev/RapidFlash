var ihex = {
    raw:    undefined,
    parsed: undefined,
};

var properties = [];
var request_url = undefined;

var firmware_type = [
    'afro',
    'afro_hv',
    'afro_nfet',
    'afro2',
    'arctictiger',
    'birdie70a',
    'bs',
    'bs_nfet',
    'bs40a',
    'dlu40a',
    'dlux',
    'dys_nfet',
    'hk200a',
    'hm135a',
    'kda',
    'mkblctrl1',
    'rb50a',
    'rb70a',
    'rct50a',
    'tbs',
    'tgy',
    'tgy6a',
    'tp_8khz',
    'tp',
    'tp_i2c',
    'tp_nfet',
    'tp70a',
    'custom'
];

var firmware_options = [
    {
        visible:        false,
        name:           'CPU_MHZ',
        description:    '',
        default:        'F_CPU / 1000000',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'BOOT_LOADER',
        description:    'Include Turnigy USB linker STK500v2 boot loader on PWM input pin',
        default:        1,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'BOOT_JUMP',
        description:    'Jump to any boot loader when PWM input stays high',
        default:        1,
        min:            0,
        max:            1
    },
    {
        visible:        false,
        name:           'BOOT_START',
        description:    '',
        default:        'THIRDBOOTSTART',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        element:        'checkbox',
        name:           'COMP_PWM',
        description:    'During PWM off, switch high side on (unsafe on some boards!)',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        false,
        name:           'DEAD_LOW_NS',
        description:    'Low-side dead time w/COMP_PWM (62.5ns steps @ 16MHz, max 2437ns)',
        default:        300,
        min:            0,
        max:            300
    },
    {
        visible:        false,
        name:           'DEAD_HIGH_NS',
        description:    'High-side dead time w/COMP_PWM (62.5ns steps @ 16MHz, max roughly PWM period)',
        default:        300,
        min:            0,
        max:            300
    },
    {
        visible:        false,
        name:           'DEAD_TIME_LOW',
        description:    '',
        default:        'DEAD_LOW_NS * CPU_MHZ / 1000',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'DEAD_TIME_HIGH',
        description:    '',
        default:        'DEAD_HIGH_NS * CPU_MHZ / 1000',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'MOTOR_ADVANCE',
        description:    'Degrees of timing advance (0 - 30, 30 meaning no delay)',
        default:        18,
        min:            0,
        max:            30
    },
    {
        visible:        true,
        name:           'TIMING_OFFSET',
        description:    'Motor timing offset in microseconds',
        default:        0,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'MOTOR_BRAKE',
        description:    'Enable brake during neutral/idle ("motor drag" brake)',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'LOW_BRAKE',
        description:    'Enable brake on very short RC pulse ("thumb" brake like on Airtronics XL2P)',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        element:        'checkbox',
        name:           'MOTOR_REVERSE',
        description:    'Reverse normal commutation direction',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'RC_PULS_REVERSE',
        description:    'Enable RC-car style forward/reverse throttle',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        element:        'checkbox',
        name:           'RC_CALIBRATION',
        description:    'Support run-time calibration of min/max pulse lengths',
        default:        1,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'SLOW_THROTTLE',
        description:    'Limit maximum throttle jump to try to prevent overcurrent',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'BEACON',
        description:    'Beep periodically when RC signal is lost',
        default:        1,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'CHECK_HARDWARE',
        description:    'Check for correct pin configuration, sense inputs, and functioning MOSFETs',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'CELL_MAX_DV',
        description:    'Maximum battery cell deciV',
        default:        43,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'CELL_MIN_DV',
        description:    'Minimum battery cell deciV',
        default:        35,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'CELL_COUNT',
        description:    '0: auto, >0: hard-coded number of cells (for reliable LVC > ~4S)',
        default:        0,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'BLIP_CELL_COUNT',
        description:    'Blip out cell count before arming',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'DEBUG_ADC_DUMP',
        description:    'Output an endless loop of all ADC values (no normal operation)',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'MOTOR_DEBUG',
        description:    'Output sync pulses on MOSI or SCK, debug flag on MISO',
        default:        0,
        min:            0,
        max:            1
    },
    {
        visible:        true,
        name:           'I2C_ADDR',
        description:    'MK-style I2C address',
        default:        0x50,
        min:            0,
        max:            255
    },
    {
        visible:        true,
        name:           'MOTOR_ID',
        description:    'MK-style I2C motor ID, or UART motor number',
        default:        1,
        min:            0,
        max:            255
    },
    {
        visible:        true,
        name:           'RCP_TOT',
        description:    'Number of 65536us periods before considering rc pulse lost',
        default:        2,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'STOP_RC_PULS',
        description:    'Stop motor at or below this pulse length',
        default:        1060,
        min:            0,
        max:            2500
    },
    {
        visible:        true,
        name:           'FULL_RC_PULS',
        description:    'Full speed at or above this pulse length',
        default:        1860,
        min:            100,
        max:            2500
    },
    {
        visible:        true,
        name:           'MAX_RC_PULS',
        description:    'Throw away any pulses longer than this',
        default:        2400,
        min:            0,
        max:            5000
    },
    {
        visible:        true,
        name:           'MIN_RC_PULS',
        description:    'Throw away any pulses shorter than this',
        default:        100,
        min:            0,
        max:            1000
    },
    {
        visible:        false,
        name:           'MID_RC_PULS',
        description:    'Neutral when RC_PULS_REVERSE = 1',
        default:        '(STOP_RC_PULS + FULL_RC_PULS) / 2',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'RCP_DEADBAND',
        description:    'Do not start until this much above or below neutral',
        default:        50,
        min:            0,
        max:            1000
    },
    {
        visible:        true,
        name:           'PROGRAM_RC_PULS',
        description:    'Normally 1660',
        default:        '(STOP_RC_PULS + FULL_RC_PULS * 3) / 4',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'RCP_DEADBAND',
        description:    '',
        default:        0,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PROGRAM_RC_PULS',
        description:    'Normally 1460',
        default:        '(STOP_RC_PULS + FULL_RC_PULS) / 2',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'RCP_LOW_DBAND',
        description:    'Brake at this many microseconds below low pulse',
        default:        60,
        min:            0,
        max:            1000
    },
    {
        visible:        true,
        name:           'MAX_DRIFT_PULS',
        description:    'Maximum jitter/drift microseconds during programming',
        default:        10,
        min:            0,
        max:            100
    },
    {
        visible:        false,
        name:           'MIN_DUTY',
        description:    '',
        default:        '56 * CPU_MHZ / 16',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'POWER_RANGE',
        description:    '',
        default:        '800 * CPU_MHZ / 16 + MIN_DUTY',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'MAX_POWER',
        description:    '',
        default:        '(POWER_RANGE-1)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PWR_COOL_START',
        description:    'Power limit while starting to reduce heating',
        default:        '(POWER_RANGE/24)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PWR_MIN_START',
        description:    'Power limit while starting (to start)',
        default:        '(POWER_RANGE/6)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PWR_MAX_START',
        description:    'Power limit while starting (if still not running)',
        default:        '(POWER_RANGE/4)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PWR_MAX_RPM1',
        description:    'Power limit when running slower than TIMING_RANGE1',
        default:        '(POWER_RANGE/4)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'PWR_MAX_RPM2',
        description:    'Power limit when running slower than TIMING_RANGE2',
        default:        '(POWER_RANGE/2)',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'BRAKE_POWER',
        description:    'Brake force is exponential, so start fairly high',
        default:        'MAX_POWER*2/3',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'BRAKE_SPEED',
        description:    'Speed to reach MAX_POWER, 0 (slowest) - 8 (fastest)',
        default:        3,
        min:            0,
        max:            8
    },
    {
        visible:        false,
        name:           'LOW_BRAKE_POWER',
        description:    '',
        default:        'MAX_POWER*2/3',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'LOW_BRAKE_SPEED',
        description:    '',
        default:        5,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMING_MIN',
        description:    '8192us per commutation',
        default:        0x8000,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMING_RANGE1',
        description:    '4096us per commutation',
        default:        0x4000,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMING_RANGE2',
        description:    '2048us per commutation',
        default:        0x2000,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMING_RANGE3',
        description:    '1024us per commutation',
        default:        0x1000,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMING_MAX',
        description:    '56us per commutation',
        default:        0x00e0,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'TIMEOUT_START',
        description:    'Timeout per commutation for ZC during starting',
        default:        48000,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_DELAY_US',
        description:    'Initial post-commutation wait during starting',
        default:        0,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_DSTEP_US',
        description:    'Microseconds per start delay step',
        default:        8,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_DELAY_INC',
        description:    'Wait step count increase (wraps in a byte)',
        default:        15,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_MOD_INC',
        description:    'Start power modulation step count increase (wraps in a byte)',
        default:        4,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_MOD_LIMIT',
        description:    'Value at which power is reduced to avoid overheating',
        default:        48,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'START_FAIL_INC',
        description:    'start_tries step count increase (wraps in a byte, upon which we disarm)',
        default:        16,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'ENOUGH_GOODIES',
        description:    'This many start cycles without timeout will transition to running mode',
        default:        12,
        min:            0,
        max:            undefined
    },
    {
        visible:        true,
        name:           'ZC_CHECK_FAST',
        description:    'Number of ZC check loops under which PWM noise should not matter',
        default:        12,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'ZC_CHECK_MAX',
        description:    'Limit ZC checking to about 1/2 PWM interval',
        default:        'POWER_RANGE / 32',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'ZC_CHECK_MIN',
        description:    '',
        default:        3,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'EEPROM_SIGN',
        description:    'Random 16-bit value',
        default:        31337,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'EEPROM_OFFSET',
        description:    'Offset into 512-byte space (why not)',
        default:        0x80,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'BL_REVISION',
        description:    '',
        default:        2,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'MAX_BUSY_WAIT_CYCLES',
        description:    '',
        default:        32,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        false,
        name:           'EXTRA_DEAD_TIME_HIGH',
        description:    '',
        default:        'DEAD_TIME_HIGH - 7',
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'EXTRA_DEAD_TIME_HIGH',
        description:    '',
        default:        0,
        min:            undefined,
        max:            undefined
    },
    {
        visible:        true,
        name:           'MAX_CHECK_LOOPS',
        description:    'ADC check takes ~200us',
        default:        5000,
        min:            undefined,
        max:            undefined
    }
];