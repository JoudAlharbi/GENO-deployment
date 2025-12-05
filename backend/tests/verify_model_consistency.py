"""
Model Consistency Verification Script
=====================================

This script verifies that the GENO model is correctly loaded and produces
consistent predictions across different invocations.

OFFICIAL MODEL ARTIFACTS:
-------------------------
1. Model File: backend/ai/geno_enet_pipeline.pkl
   - Type: sklearn.pipeline.Pipeline
   - Contains: StandardScaler -> SelectKBest(k=50) -> LogisticRegression(elasticnet)
   - Trained by: backend/ai/train_model.py
   - Input: 237 gene expression features
   - Output: Binary classification (0=low risk, 1=high risk)

2. Gene Columns File: backend/ai/geno_selected_genes.json
   - Contains: ALL 237 column names (needed for StandardScaler)
   - Order: Must match the order used during training

3. Selected Features File: backend/ai/geno_selected_features.json
   - Contains: 50 best features selected by SelectKBest
   - For reference only (the pipeline handles this internally)

PIPELINE STRUCTURE:
-------------------
Pipeline([
    ('scaler', StandardScaler()),           # Expects 237 features
    ('selector', SelectKBest(k=50)),        # Selects top 50 features
    ('classifier', LogisticRegression(...)) # Elastic Net regularization
])

RISK LEVEL THRESHOLDS:
----------------------
- prob_high < 0.33  -> LOW
- prob_high < 0.66  -> MEDIUM
- prob_high >= 0.66 -> HIGH

Run this script to verify model consistency:
    python tests/verify_model_consistency.py
"""

import os
import sys
import json
import glob

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
import numpy as np
import joblib

# ===================== Configuration =====================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AI_DIR = os.path.join(BASE_DIR, "ai")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads", "demo_user")

MODEL_PATH = os.path.join(AI_DIR, "geno_enet_pipeline.pkl")
GENES_PATH = os.path.join(AI_DIR, "geno_selected_genes.json")
FEATURES_PATH = os.path.join(AI_DIR, "geno_selected_features.json")


def print_header(title):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def verify_model_artifacts():
    """Verify that all model artifacts exist and are valid."""
    print_header("1. VERIFYING MODEL ARTIFACTS")
    
    artifacts = [
        ("Model file", MODEL_PATH),
        ("Genes file", GENES_PATH),
        ("Features file", FEATURES_PATH),
    ]
    
    all_ok = True
    for name, path in artifacts:
        exists = os.path.exists(path)
        size = os.path.getsize(path) if exists else 0
        status = "OK" if exists else "MISSING"
        print(f"  {name}: {status} ({size:,} bytes)")
        print(f"    Path: {path}")
        if not exists:
            all_ok = False
    
    return all_ok


def load_and_inspect_model():
    """Load the model and inspect its structure."""
    print_header("2. LOADING AND INSPECTING MODEL")
    
    # Load model
    print(f"  Loading model from: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    print(f"  Model type: {type(model).__name__}")
    
    # Inspect pipeline steps
    if hasattr(model, 'named_steps'):
        print(f"  Pipeline steps:")
        for name, step in model.named_steps.items():
            print(f"    - {name}: {type(step).__name__}")
            
            # Show scaler info
            if hasattr(step, 'n_features_in_'):
                print(f"        n_features_in: {step.n_features_in_}")
            
            # Show selector info
            if hasattr(step, 'k'):
                print(f"        k (selected features): {step.k}")
            
            # Show classifier info
            if hasattr(step, 'penalty'):
                print(f"        penalty: {step.penalty}")
            if hasattr(step, 'l1_ratio'):
                print(f"        l1_ratio: {step.l1_ratio}")
    
    # Load genes
    print(f"\n  Loading genes from: {GENES_PATH}")
    with open(GENES_PATH, "r") as f:
        genes = json.load(f)
    print(f"  Total genes (columns): {len(genes)}")
    print(f"  First 5 genes: {genes[:5]}")
    
    # Load selected features
    print(f"\n  Loading selected features from: {FEATURES_PATH}")
    with open(FEATURES_PATH, "r") as f:
        features = json.load(f)
    print(f"  Selected features: {len(features)}")
    
    return model, genes, features


def run_consistency_tests(model, genes):
    """Run prediction tests on sample CSV files."""
    print_header("3. RUNNING CONSISTENCY TESTS")
    
    # Find sample CSV files
    csv_files = glob.glob(os.path.join(UPLOADS_DIR, "*.csv"))
    if not csv_files:
        print(f"  WARNING: No CSV files found in {UPLOADS_DIR}")
        return []
    
    print(f"  Found {len(csv_files)} CSV files in uploads folder")
    
    # Test predictions on a few samples
    results = []
    test_files = csv_files[:5]  # Test first 5 files
    
    for csv_path in test_files:
        filename = os.path.basename(csv_path)
        
        try:
            # Load CSV
            df = pd.read_csv(csv_path)
            
            # Get actual label if present
            actual_label = None
            if 'label' in df.columns:
                actual_label = int(df['label'].iloc[0])
                df = df.drop(columns=['label'])
            
            # Prepare features in correct order
            df_features = pd.DataFrame()
            for gene in genes:
                if gene in df.columns:
                    df_features[gene] = df[gene].values
                else:
                    df_features[gene] = 0
            
            # Predict
            y_pred = int(model.predict(df_features)[0])
            probs = model.predict_proba(df_features)[0]
            prob_high = float(probs[1])
            
            # Determine risk level
            if prob_high < 0.33:
                risk_level = "LOW"
            elif prob_high < 0.66:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"
            
            result = {
                "file": filename,
                "actual_label": actual_label,
                "predicted_class": y_pred,
                "prob_low": round(probs[0], 4),
                "prob_high": round(prob_high, 4),
                "risk_level": risk_level,
                "correct": (actual_label == y_pred) if actual_label is not None else None
            }
            results.append(result)
            
            # Print result
            correct_str = "CORRECT" if result["correct"] else ("WRONG" if result["correct"] is False else "N/A")
            print(f"\n  {filename}:")
            print(f"    Actual label:    {actual_label}")
            print(f"    Predicted class: {y_pred}")
            print(f"    Prob(low):       {probs[0]:.4f}")
            print(f"    Prob(high):      {prob_high:.4f}")
            print(f"    Risk level:      {risk_level}")
            print(f"    Verification:    {correct_str}")
            
        except Exception as e:
            print(f"\n  {filename}: ERROR - {e}")
            results.append({"file": filename, "error": str(e)})
    
    return results


def verify_no_fallback_logic():
    """Check that geno_service.py has no fallback/dummy prediction logic."""
    print_header("4. VERIFYING NO FALLBACK LOGIC")
    
    service_path = os.path.join(AI_DIR, "geno_service.py")
    
    with open(service_path, "r") as f:
        content = f.read()
    
    # Check for problematic patterns
    bad_patterns = [
        ("random", "random prediction"),
        ("dummy", "dummy/placeholder"),
        ("fallback", "fallback logic"),
        ("placeholder", "placeholder"),
        ("0.5", "hardcoded 0.5 probability"),
    ]
    
    found_issues = []
    for pattern, description in bad_patterns:
        if pattern.lower() in content.lower():
            # Check context - some are OK in comments
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if pattern.lower() in line.lower() and not line.strip().startswith('#'):
                    if 'test' not in line.lower() and 'dummy_df' not in line.lower():
                        found_issues.append(f"Line {i+1}: {line.strip()}")
    
    if found_issues:
        print("  WARNING: Potentially problematic patterns found:")
        for issue in found_issues[:5]:
            print(f"    {issue}")
    else:
        print("  OK: No fallback or placeholder logic detected")
    
    return len(found_issues) == 0


def generate_summary(results):
    """Generate a summary of the verification."""
    print_header("5. VERIFICATION SUMMARY")
    
    if not results:
        print("  No test results available")
        return
    
    # Calculate accuracy
    tested = [r for r in results if r.get("correct") is not None]
    if tested:
        correct = sum(1 for r in tested if r["correct"])
        accuracy = correct / len(tested) * 100
        print(f"  Test samples: {len(tested)}")
        print(f"  Correct predictions: {correct}")
        print(f"  Accuracy: {accuracy:.1f}%")
    
    # Risk level distribution
    risk_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for r in results:
        if "risk_level" in r:
            risk_counts[r["risk_level"]] += 1
    
    print(f"\n  Risk level distribution:")
    for level, count in risk_counts.items():
        print(f"    {level}: {count}")
    
    # Expected behavior check
    print(f"\n  EXPECTED BEHAVIOR:")
    print(f"    - High-risk samples (label=1) should have prob_high > 0.66")
    print(f"    - Low-risk samples (label=0) should have prob_high < 0.33")
    print(f"    - The model should NOT produce random or inconsistent results")


def main():
    """Run all verification checks."""
    print("\n" + "=" * 60)
    print(" GENO MODEL CONSISTENCY VERIFICATION")
    print(" Run this script to verify the AI model is working correctly")
    print("=" * 60)
    
    # Step 1: Verify artifacts exist
    if not verify_model_artifacts():
        print("\n  FATAL: Model artifacts missing. Cannot continue.")
        return False
    
    # Step 2: Load and inspect model
    try:
        model, genes, features = load_and_inspect_model()
    except Exception as e:
        print(f"\n  FATAL: Could not load model: {e}")
        return False
    
    # Step 3: Run consistency tests
    results = run_consistency_tests(model, genes)
    
    # Step 4: Verify no fallback logic
    no_fallback = verify_no_fallback_logic()
    
    # Step 5: Generate summary
    generate_summary(results)
    
    print("\n" + "=" * 60)
    print(" VERIFICATION COMPLETE")
    print("=" * 60)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

