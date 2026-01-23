// src/utils/logger.js

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class Logger {
  static formatDate() {
    return new Date().toISOString();
  }

  static info(message, data = null) {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${this.formatDate()} - ${message}`);
    if (data) console.log(data);
  }

  static success(message, data = null) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${this.formatDate()} - ${message}`);
    if (data) console.log(data);
  }

  static warn(message, data = null) {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${this.formatDate()} - ${message}`);
    if (data) console.log(data);
  }

  static error(message, error = null) {
    console.error(`${colors.red}[ERROR]${colors.reset} ${this.formatDate()} - ${message}`);
    if (error) {
      console.error('Error Details:', {
        message: error.message,
        stack: error.stack,
        ...(error.response && { response: error.response })
      });
    }
  }

  static request(req) {
    const { method, originalUrl, ip } = req;
    console.log(`${colors.blue}[REQUEST]${colors.reset} ${this.formatDate()} - ${method} ${originalUrl} from ${ip}`);
  }

  static db(message) {
    console.log(`${colors.magenta}[DATABASE]${colors.reset} ${this.formatDate()} - ${message}`);
  }
}

module.exports = Logger;