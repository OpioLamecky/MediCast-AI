import psutil
import logging
from .models import GPUMetrics

logger = logging.getLogger(__name__)

try:
    import pynvml
    pynvml.nvmlInit()
    HAS_GPU = True
except Exception as e:
    logger.warning(f"Could not initialize NVML: {e}. Falling back to CPU metrics.")
    HAS_GPU = False

def get_gpu_metrics() -> GPUMetrics:
    if HAS_GPU:
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            util_rates = pynvml.nvmlDeviceGetUtilizationRates(handle)
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            
            return GPUMetrics(
                gpu_util=float(util_rates.gpu),
                memory_used=float(mem_info.used) / (1024**2),
                temperature=float(temp)
            )
        except Exception as e:
            logger.error(f"Error reading GPU metrics: {e}")
            
    # Fallback or mock values when running on CPU
    return GPUMetrics(
        gpu_util=psutil.cpu_percent(),
        memory_used=psutil.virtual_memory().used / (1024**2),
        temperature=45.0
    )
