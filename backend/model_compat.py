"""Compatibility shims for classes pickled from the training notebook."""

from __future__ import annotations

import sys

from imblearn.over_sampling import SMOTE
from sklearn.base import BaseEstimator, TransformerMixin


class ColumnSelector(BaseEstimator, TransformerMixin):
    """Select a named subset of columns from a DataFrame."""

    def __init__(self, columns=None):
        self.columns = columns

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        return X[self.columns]


class SMOTEDataFrame(SMOTE):
    """SMOTE that preserves DataFrame column names."""

    def fit_resample(self, X, y):
        columns = X.columns if hasattr(X, "columns") else None
        X_res, y_res = super().fit_resample(X, y)
        if columns is not None:
            import pandas as pd

            X_res = pd.DataFrame(X_res, columns=columns)
        return X_res, y_res


def register_notebook_classes() -> None:
    """Notebooks pickle custom classes under __main__; register them before joblib.load."""
    main = sys.modules["__main__"]
    main.ColumnSelector = ColumnSelector
    main.SMOTEDataFrame = SMOTEDataFrame
    # Also expose under this module name in case the pickle uses it
    sys.modules.setdefault("model_compat", sys.modules[__name__])
