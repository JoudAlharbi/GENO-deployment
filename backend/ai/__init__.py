"""
GENO AI Package
===============
Contains the trained model, selected genes, and prediction function.

Note: Model loading is lazy - it only loads when predict_geno() is first called.
This allows the app to start without requiring sklearn at import time.
"""

from .geno_service import predict_geno, _ensure_model_loaded

# Lazy access to selected_genes and _model - will be None until model is loaded
def get_selected_genes():
    """Get selected genes list (loads model if not already loaded)"""
    _ensure_model_loaded()
    from .geno_service import selected_genes
    return selected_genes

def get_model():
    """Get the loaded model (loads model if not already loaded)"""
    _ensure_model_loaded()
    from .geno_service import _model
    return _model

# For backward compatibility - these will trigger lazy loading when accessed
def _get_selected_genes():
    """Backward compatibility wrapper"""
    return get_selected_genes()

def _get_model():
    """Backward compatibility wrapper"""
    return get_model()

# Export for backward compatibility
# Note: selected_genes and _model are now accessed via functions, not direct imports
__all__ = ['predict_geno', 'get_selected_genes', 'get_model']
