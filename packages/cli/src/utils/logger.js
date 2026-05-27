// ============================================================
// Colored logger with spinner for @cinacoin/cli
// ============================================================
// ANSI color codes (no external dependency needed for basic colors)
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';
/** Log a success message with a green checkmark. */
export function success(message) {
    console.log(`  ${GREEN}✔${RESET} ${message}`);
}
/** Log an error message with a red cross. */
export function error(message) {
    console.error(`  ${RED}✘${RESET} ${RED}${message}${RESET}`);
}
/** Log a warning with a yellow triangle. */
export function warn(message) {
    console.log(`  ${YELLOW}⚠${RESET} ${YELLOW}${message}${RESET}`);
}
/** Log an info message with a cyan bullet. */
export function info(message) {
    console.log(`  ${CYAN}ℹ${RESET} ${message}`);
}
/** Log a debug message in gray. */
export function debug(message) {
    console.log(`  ${GRAY}›${RESET} ${GRAY}${message}${RESET}`);
}
/** Log a bold header. */
export function header(text) {
    console.log(`\n  ${BOLD}${text}${RESET}\n`);
}
/**
 * Simple spinner implementation (no ora dependency required).
 * Returns an object with succeed/fail methods.
 */
export function spinner(message) {
    // Start spinner
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write(`  ${CYAN}${frames[0]}${RESET} ${message}`);
    const interval = setInterval(() => {
        i = (i + 1) % frames.length;
        // Move cursor back and rewrite
        process.stdout.write(`\r  ${CYAN}${frames[i]}${RESET} ${message}`);
    }, 80);
    const clear = () => {
        clearInterval(interval);
        // Clear the spinner line
        process.stdout.write('\r' + ' '.repeat(message.length + 10) + '\r');
    };
    return {
        succeed(msg) {
            clear();
            success(msg ?? message);
        },
        fail(msg) {
            clear();
            error(msg ?? message);
        },
        warn(msg) {
            clear();
            warn(msg ?? message);
        },
    };
}
//# sourceMappingURL=logger.js.map