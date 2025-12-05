import os
import json
import joblib
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "geno_enet_pipeline.pkl")
GENES_PATH = os.path.join(BASE_DIR, "geno_selected_genes.json")

# Lazy loading variables - will be initialized on first use
_model = None
selected_genes = None
_model_loaded = False


def _ensure_model_loaded():
    """
    Lazy load the model and selected genes on first use.
    This allows the app to start without requiring sklearn at import time.
    """
    global _model, selected_genes, _model_loaded
    
    if _model_loaded:
        return
    
    print("\n================ GENO MODEL LOADING ================\n")
    
    # Load model
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at: {MODEL_PATH}")
    
    try:
        _model = joblib.load(MODEL_PATH)
        print("[GENO] Model loaded successfully!")
        print("[GENO] Model type:", type(_model))
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {str(e)}. Make sure scikit-learn and joblib are installed.")
    
    # Load selected genes
    if not os.path.exists(GENES_PATH):
        raise FileNotFoundError(f"Genes file not found at: {GENES_PATH}")
    
    with open(GENES_PATH, "r") as f:
        selected_genes = json.load(f)
    
    print(f"[GENO] Loaded {len(selected_genes)} selected genes")
    print("======================================================\n")
    
    _model_loaded = True


# ===========================================================
#   TRUE GENO PREDICTION — NO MANIPULATION
# ===========================================================

def predict_geno(df, sequence_id=None, user_id=None):
    """
    Run GENO model prediction on a DataFrame.
    
    Args:
        df: pandas DataFrame with gene expression data
        sequence_id: Optional sequence ID for the report (e.g., "SEQ-ABC123")
        user_id: Optional user ID for the report
    
    Returns:
        dict with prediction results and detailed report
    """
    # Lazy load model on first use
    _ensure_model_loaded()
    
    # Select only the chosen genes
    df_selected = df[selected_genes]

    # Predict probability directly from the model
    probs = _model.predict_proba(df_selected)[0]
    score_raw = float(probs[1])           # Class 1 = addiction risk

    # Convert to percentage (no modifications)
    score_percent = round(score_raw * 100, 2)

    # Risk classification ONLY based on 75% threshold
    risk_level = "HIGH" if score_percent >= 75 else "LOW"

    # =========================================================
    # BUILD DETAILED REPORT
    # =========================================================
    
    # Get the sample row for gene expression analysis
    sample_row = df_selected.iloc[0]
    
    # Get genes that actually contributed to the risk prediction
    # Only show genes if risk score indicates actual addiction risk (> 1%)
    top_genes = []
    
    if score_percent > 1.0:  # Only show genes if there's meaningful risk
        try:
            # Get the classifier from the pipeline
            classifier = _model.named_steps['classifier']
            selector = _model.named_steps['selector']
            scaler = _model.named_steps['scaler']
            
            # Get coefficients (these indicate contribution to risk)
            coefficients = classifier.coef_[0]  # Shape: (n_selected_features,)
            
            # Get which features were selected by SelectKBest
            selected_mask = selector.get_support()
            selected_gene_names = [gene for gene, selected in zip(selected_genes, selected_mask) if selected]
            
            # Get the scaled values for selected features
            sample_scaled = scaler.transform(df_selected)[0]
            sample_scaled_selected = sample_scaled[selected_mask]
            
            # Calculate contribution: coefficient * scaled_expression_value
            # Higher absolute contribution = more important for this prediction
            gene_contributions = []
            for i, (gene_name, coef, scaled_val) in enumerate(zip(selected_gene_names, coefficients, sample_scaled_selected)):
                # Contribution is the product of coefficient and scaled value
                # Positive contribution increases risk, negative decreases it
                contribution = coef * scaled_val
                gene_contributions.append({
                    'gene': gene_name,
                    'coefficient': float(coef),
                    'scaled_expression': float(scaled_val),
                    'contribution': float(contribution),
                    'raw_expression': float(sample_row[gene_name])
                })
            
            # Sort by absolute contribution (genes that matter most for this prediction)
            gene_contributions.sort(key=lambda x: abs(x['contribution']), reverse=True)
            
            # Take top 10 genes that contributed most to the risk prediction
            for gene_info in gene_contributions[:10]:
                # Determine impact based on contribution
                if gene_info['contribution'] > 0:
                    impact = f"Positive risk contributor (coef: {gene_info['coefficient']:.3f})"
                else:
                    impact = f"Negative risk contributor (coef: {gene_info['coefficient']:.3f})"
                
                top_genes.append({
                    "gene": gene_info['gene'],
                    "expression": round(gene_info['raw_expression'], 4),
                    "impact": impact,
                    "contribution": round(gene_info['contribution'], 4)
                })
        except Exception as e:
            # Fallback: if we can't extract contributions, don't show genes
            print(f"[WARNING] Could not extract gene contributions: {e}")
            top_genes = []
    else:
        # Risk score too low (< 1%), no addiction-related genes to show
        top_genes = []
    
    # Bottom genes removed - Section C was removed per user request
    bottom_genes = []
    
    # Gene expression statistics
    gene_stats = {
        "mean_expression": round(float(sample_row.mean()), 4),
        "median_expression": round(float(sample_row.median()), 4),
        "std_expression": round(float(sample_row.std()), 4),
        "min_expression": round(float(sample_row.min()), 4),
        "max_expression": round(float(sample_row.max()), 4),
        "genes_above_mean": int((sample_row > sample_row.mean()).sum()),
        "genes_below_mean": int((sample_row < sample_row.mean()).sum())
    }
    
    # Build the detailed report object
    report = {
        "sample_id": sequence_id or f"SEQ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "laboratory_user_id": user_id or "LAB-DEMO-001",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "model_name": "geno_enet_pipeline.pkl",
        "model_version": "2.0",
        "total_genes_in_model": len(selected_genes),
        "genes_analyzed": len(df_selected.columns),
        "risk_level": risk_level,
        "risk_score_percent": score_percent,
        "risk_score_raw": score_raw,
        "risk_threshold": 75.0,
        "summary_title": f"Genetic Risk Analysis Report - {risk_level} RISK",
        "summary_text": (
            f"The genetic analysis indicates a {risk_level} addiction risk profile "
            f"based on the evaluated gene-expression markers. "
            f"The model analyzed {len(selected_genes)} genetic markers and calculated "
            f"a risk probability of {score_percent}%. "
            + ("This score exceeds the 75% threshold, indicating elevated risk." 
               if risk_level == "HIGH" 
               else "This score is below the 75% threshold, indicating lower risk.")
        ),
        "top_genes": top_genes,
        "bottom_genes": bottom_genes,  # Empty - Section C removed
        "gene_stats": gene_stats,
        "methodology": {
            "algorithm": "Elastic Net Logistic Regression",
            "preprocessing": "StandardScaler normalization",
            "feature_selection": "SelectKBest with f_classif",
            "training_samples": "Gene expression dataset",
            "validation": "Cross-validation"
        }
    }

    return {
        "score_raw": score_raw,
        "score_percent": score_percent,
        "risk_level": risk_level,
        "model_used": "geno_enet_pipeline.pkl",
        "genes_used": len(selected_genes),
        "report": report
    }
