from abc import ABC, abstractmethod


class BaseAdapter(ABC):
    @abstractmethod
    def run(self, county_config: dict) -> None:
        pass
