from datetime import datetime


class RowRecord:
    def __init__(self, data: dict = None, **kwargs):
        combined = dict(data or {})
        combined.update(kwargs)
        for k, v in combined.items():
            setattr(self, k, v)
        self._raw = combined

    def __getitem__(self, item):
        return getattr(self, item)

    def __setitem__(self, key, value):
        setattr(self, key, value)
        self._raw[key] = value

    def get(self, key, default=None):
        return getattr(self, key, default)

    def to_dict(self):
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}
