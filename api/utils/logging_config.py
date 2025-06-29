import logging
import colorama
from colorama import Fore, Style

# Initialize colorama (required for Windows)
colorama.init(autoreset=True)

def setup_logger(name, level=logging.DEBUG, console_level=logging.DEBUG):
    """
    Set up and return a logger with colored console output.
    
    Args:
        name (str): Logger name
        level (int): Logger level
        console_level (int): Console handler level
        
    Returns:
        logging.Logger: Configured logger
    """
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid duplicate handlers if logger already exists
    if logger.handlers:
        return logger
    
    # Create console handler and set level
    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)
    
    # Create colored formatter
    class ColoredFormatter(logging.Formatter):
        FORMATS = {
            logging.DEBUG: Fore.CYAN + '%(asctime)s - %(name)s - %(levelname)s - %(message)s' + Style.RESET_ALL,
            logging.INFO: Fore.GREEN + '%(asctime)s - %(name)s - %(levelname)s - %(message)s' + Style.RESET_ALL,
            logging.WARNING: Fore.YELLOW + '%(asctime)s - %(name)s - %(levelname)s - %(message)s' + Style.RESET_ALL,
            logging.ERROR: Fore.RED + '%(asctime)s - %(name)s - %(levelname)s - %(message)s' + Style.RESET_ALL,
            logging.CRITICAL: Fore.RED + Style.BRIGHT + '%(asctime)s - %(name)s - %(levelname)s - %(message)s' + Style.RESET_ALL
        }
        
        def format(self, record):
            log_format = self.FORMATS.get(record.levelno)
            formatter = logging.Formatter(log_format)
            return formatter.format(record)
    
    # Add formatter to console handler
    console_handler.setFormatter(ColoredFormatter())
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger