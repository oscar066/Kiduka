import joblib
import json
import numpy as np
import argparse
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier, plot_tree
import matplotlib.pyplot as plt

def tree_to_dict(tree, feature_names):
    tree_ = tree.tree_
    
    def recurse(node):
        if tree_.feature[node] != -2:  # Not a leaf node
            name = feature_names[tree_.feature[node]]
            threshold = float(tree_.threshold[node])
            return {
                "type": "node",
                "feature": name,
                "threshold": threshold,
                "left": recurse(tree_.children_left[node]),
                "right": recurse(tree_.children_right[node])
            }
        else:
            # Leaf node
            # The value is the number of samples for each class
            value = tree_.value[node][0].tolist()
            # Most likely class
            class_id = int(np.argmax(value))
            return {
                "type": "leaf",
                "value": value,
                "predicted_class": class_id
            }

    return recurse(0)

def load_model(model, output, feature_names=None, visualize=False, tree_index=0, viz_output=None):
    print(f"Loading model from {model}...")
    model_obj = joblib.load(model)
    
    if isinstance(model_obj, RandomForestClassifier):
        model_type = "RandomForestClassifier"
        estimators = model_obj.estimators_
    elif isinstance(model_obj, DecisionTreeClassifier):
        model_type = "DecisionTreeClassifier"
        estimators = [model_obj]
    else:
        # Fallback check for any model that has tree_ or estimators_
        if hasattr(model_obj, 'estimators_'):
            model_type = "EnsembleModel"
            estimators = model_obj.estimators_
        elif hasattr(model_obj, 'tree_'):
            model_type = "DecisionTreeModel"
            estimators = [model_obj]
        else:
            raise ValueError(f"Unsupported model type: {type(model_obj)}. Only Random Forest and Decision Tree are supported.")

    if feature_names is None:
        if hasattr(model_obj, 'feature_names_in_'):
            feature_names = model_obj.feature_names_in_.tolist()
        else:
            n_features = model_obj.n_features_in_
            feature_names = [f"feature_{i}" for i in range(n_features)]

    forest_dict = {
        "model_type": model_type,
        "n_estimators": len(estimators),
        "feature_names": feature_names,
        "classes": model_obj.classes_.tolist() if hasattr(model_obj, 'classes_') else None,
        "trees": [tree_to_dict(estimator, feature_names) for estimator in estimators]
    }

    print(f"Saving rules to {output}...")
    with open(output, 'w') as f:
        json.dump(forest_dict, f, indent=4)
        
    if visualize:
        visualize_model(model, tree_index=tree_index, feature_names=feature_names, output_path=viz_output)
    
    print("Done!")

def visualize_model(model, tree_index=0, feature_names=None, output_path=None, figsize=(20, 10)):
    print(f"Loading model for visualization from {model}...")
    model_obj = joblib.load(model)
    
    if hasattr(model_obj, 'estimators_'):
        if tree_index >= len(model_obj.estimators_):
            raise ValueError(f"Tree index {tree_index} is out of bounds (model has {len(model_obj.estimators_)} trees).")
        estimator = model_obj.estimators_[tree_index]
    elif hasattr(model_obj, 'tree_'):
        estimator = model_obj
    else:
        raise ValueError(f"Unsupported model type: {type(model_obj)}. Cannot visualize.")
    
    if feature_names is None:
        if hasattr(model_obj, 'feature_names_in_'):
            feature_names = model_obj.feature_names_in_.tolist()
        else:
            feature_names = [f"feature_{i}" for i in range(model_obj.n_features_in_)]

    plt.figure(figsize=figsize)
    plot_tree(estimator, 
              feature_names=feature_names, 
              class_names=[str(c) for c in model_obj.classes_] if hasattr(model_obj, 'classes_') else None,
              filled=True, 
              rounded=True)
    
    if output_path:
        print(f"Saving visualization to {output_path}...")
        plt.savefig(output_path)
        plt.close()
    else:
        plt.show()
    print("Visualization Done!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export a Joblib Random Forest or Decision Tree model to JSON.")
    parser.add_argument("--model", type=str, required=True, help="Path to the .joblib model file")
    parser.add_argument("--output", type=str, help="Path to the output .json file")
    parser.add_argument("--visualize", action="store_true", help="Generate a visualization of a tree")
    parser.add_argument("--tree-index", type=int, default=0, help="Index of the tree to visualize (default: 0)")
    parser.add_argument("--viz-output", type=str, help="Path to save the visualization (e.g., .png or .pdf)")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.model):
        print(f"Error: Model file {args.model} not found.")
    else:
        if args.output:
            load_model(args.model, args.output)
        
        if args.visualize:
            visualize_model(args.model, tree_index=args.tree_index, output_path=args.viz_output)
