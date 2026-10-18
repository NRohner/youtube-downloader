from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """JSON in/out is camelCase (what the frontend uses); snake_case is still accepted."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
