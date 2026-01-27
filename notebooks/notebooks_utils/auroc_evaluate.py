import numpy as np
import matplotlib.pyplot as plt
from itertools import cycle
from sklearn.metrics import roc_auc_score, roc_curve, auc
from sklearn.preprocessing import LabelBinarizer
from scipy.special import softmax

def evaluate_and_plot_multiclass_roc(model, X_test, y_test, classes, title='Multiclass ROC Curve (One-vs-Rest)'):
    """
    Calculates AUROC and plots ROC curves for a multiclass model (OvR).
    Handles decision_function and applies softmax to satisfy probability requirements.
    """
    
    # 1. Get raw scores
    if hasattr(model, "decision_function"):
        y_score_raw = model.decision_function(X_test)
    else:
        y_score_raw = model.predict_proba(X_test)

    # Handle binary classification case (1D array)
    if y_score_raw.ndim == 1:
        # If 1D, it's typically decision scores for the positive class.
        # We construct a 2D array: [score_class_0, score_class_1] = [-score, score]
        # This assumes binary classification logic for linear models.
        y_score_raw = np.vstack([-y_score_raw, y_score_raw]).T
        
    # 2. Apply Softmax to get probabilities (sum to 1)
    y_prob = softmax(y_score_raw, axis=1)
    
    # 3. Binarize labels
    lb = LabelBinarizer()
    y_test_bin = lb.fit_transform(y_test)
    n_classes = y_test_bin.shape[1]
    
    # If n_classes is 1 (binary), we need to handle it as 2 classes to match y_prob
    if n_classes == 1:
        y_test_bin = np.hstack([1 - y_test_bin, y_test_bin])
        n_classes = 2

    if y_prob.shape[1] != n_classes:
        print(f"Error: Model predicts {y_prob.shape[1]} classes, but test set has {n_classes} classes.")
        return

    # 4. Calculate AUROC Score (Macro)
    # Use y_test_bin instead of y_test to ensure consistent shapes (especially for binary case where we expanded it)
    overall_auroc = roc_auc_score(y_test_bin, y_prob, multi_class='ovr', average='macro')
    print(f"Multiclass AUROC Score (Macro Average) for {title}: {overall_auroc:.4f}")

    # 5. Compute ROC curves
    fpr = dict()
    tpr = dict()
    roc_auc = dict()
    
    for i in range(n_classes):
        fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_prob[:, i])
        roc_auc[i] = auc(fpr[i], tpr[i])

    # 6. Compute Macro-Average ROC curve
    all_fpr = np.unique(np.concatenate([fpr[i] for i in range(n_classes)]))
    mean_tpr = np.zeros_like(all_fpr)
    for i in range(n_classes):
        mean_tpr += np.interp(all_fpr, fpr[i], tpr[i])

    mean_tpr /= n_classes
    fpr["macro"] = all_fpr
    tpr["macro"] = mean_tpr
    roc_auc["macro"] = auc(fpr["macro"], tpr["macro"])

    # 7. Plot
    plt.figure(figsize=(12, 10))
    plt.plot(
        fpr["macro"], 
        tpr["macro"], 
        label=f'Macro-average ROC (AUC = {roc_auc["macro"]:0.2f})',
        color='navy', 
        linestyle=':', 
        linewidth=4
    )

    colors = cycle(['aqua', 'darkorange', 'cornflowerblue', 'green', 'red', 'purple', 'brown', 'pink', 'gray', 'olive'])
    for i, color in zip(range(n_classes), colors):
        label = str(classes[i]) if i < len(classes) else str(i)
        plt.plot(
            fpr[i], 
            tpr[i], 
            color=color, 
            lw=2,
            alpha=0.6,
            label=f'Class {label} (AUC = {roc_auc[i]:0.2f})'
        )

    plt.plot([0, 1], [0, 1], 'k--', lw=2)
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title(title)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    plt.show()