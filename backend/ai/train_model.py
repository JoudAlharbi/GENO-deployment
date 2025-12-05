"""
Train GENO Elastic Net Logistic Regression Model

This script trains the real GENO model using sample data and saves:
- geno_enet_pipeline.pkl: The trained sklearn pipeline
- geno_selected_genes.json: List of ALL feature column names (needed for inference)
- geno_selected_features.json: List of the 50 best features selected by the model

IMPORTANT: The pipeline includes StandardScaler which needs ALL features during inference,
not just the selected ones. The SelectKBest step handles the feature reduction internally.
"""

import os
import sys
import json
import glob
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import cross_val_score

# Get paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
UPLOADS_DIR = os.path.join(BACKEND_DIR, "uploads", "demo_user")

MODEL_PATH = os.path.join(SCRIPT_DIR, "geno_enet_pipeline.pkl")
GENES_PATH = os.path.join(SCRIPT_DIR, "geno_selected_genes.json")  # ALL columns
FEATURES_PATH = os.path.join(SCRIPT_DIR, "geno_selected_features.json")  # Top 50 features

def load_all_samples():
    """Load all CSV samples from uploads folder"""
    csv_files = glob.glob(os.path.join(UPLOADS_DIR, "*.csv"))
    
    all_data = []
    all_labels = []
    all_columns = None
    
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file)
            
            # Check if 'label' column exists
            if 'label' not in df.columns:
                print(f"Skipping {csv_file}: no 'label' column")
                continue
            
            # Separate features and label
            label = df['label'].iloc[0]
            features = df.drop(columns=['label'])
            
            if all_columns is None:
                all_columns = features.columns.tolist()
            
            # Only use columns that are in all files
            common_cols = [c for c in all_columns if c in features.columns]
            features = features[common_cols]
            
            all_data.append(features.values[0])
            all_labels.append(label)
            
            print(f"Loaded: {os.path.basename(csv_file)} - Label: {label}")
            
        except Exception as e:
            print(f"Error loading {csv_file}: {e}")
    
    if not all_data:
        raise ValueError("No valid CSV files found!")
    
    X = np.array(all_data)
    y = np.array(all_labels)
    
    print(f"\nLoaded {len(all_data)} samples with {len(all_columns)} features")
    print(f"Label distribution: 0={sum(y==0)}, 1={sum(y==1)}")
    
    return X, y, all_columns

def train_model():
    """Train and save the GENO Elastic Net model"""
    print("=" * 50)
    print("Training GENO Elastic Net Logistic Regression Model")
    print("=" * 50)
    
    # Load data
    X, y, gene_columns = load_all_samples()
    
    # Select top features based on variance and correlation
    n_features = min(50, X.shape[1])  # Select top 50 genes or less
    
    # Create pipeline with Elastic Net Logistic Regression
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('selector', SelectKBest(f_classif, k=n_features)),
        ('classifier', LogisticRegression(
            penalty='elasticnet',
            solver='saga',
            l1_ratio=0.5,  # Balance between L1 and L2
            C=1.0,
            max_iter=5000,
            random_state=42,
            class_weight='balanced'
        ))
    ])
    
    # Fit the pipeline
    print("\nTraining model...")
    pipeline.fit(X, y)
    
    # Get selected feature indices (top 50 after SelectKBest)
    selector = pipeline.named_steps['selector']
    selected_indices = selector.get_support(indices=True)
    selected_features = [gene_columns[i] for i in selected_indices]
    
    print(f"Selected {len(selected_features)} top features for prediction")
    
    # Cross-validation score
    try:
        cv_scores = cross_val_score(pipeline, X, y, cv=min(3, len(y)), scoring='accuracy')
        print(f"Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    except Exception as e:
        print(f"Could not compute CV score: {e}")
    
    # Save the model
    print(f"\nSaving model to: {MODEL_PATH}")
    joblib.dump(pipeline, MODEL_PATH)
    
    # Save ALL columns (needed for inference - the scaler expects all features)
    print(f"Saving ALL {len(gene_columns)} column names to: {GENES_PATH}")
    with open(GENES_PATH, 'w') as f:
        json.dump(gene_columns, f, indent=2)
    
    # Save selected features (for reference)
    print(f"Saving {len(selected_features)} selected features to: {FEATURES_PATH}")
    with open(FEATURES_PATH, 'w') as f:
        json.dump(selected_features, f, indent=2)
    
    print("\n" + "=" * 50)
    print("Model training complete!")
    print("=" * 50)
    
    # Test prediction
    print("\nTesting model prediction...")
    test_pred = pipeline.predict(X[:1])
    test_proba = pipeline.predict_proba(X[:1])[0]
    print(f"Sample prediction: class={test_pred[0]}, prob=[{test_proba[0]:.3f}, {test_proba[1]:.3f}]")
    
    return pipeline, gene_columns, selected_features

if __name__ == "__main__":
    train_model()

