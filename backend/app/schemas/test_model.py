from typing import List, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum

class QuestionType(str, Enum):
    MCQ_MAIN = "MCQ_MAIN"
    NUMERICAL_MAIN = "NUMERICAL_MAIN"
    ADV_SINGLE = "ADV_SINGLE"
    ADV_MULTIPLE = "ADV_MULTIPLE"

class QuestionModel(BaseModel):
    id: str
    type: QuestionType
    correct: Union[int, List[int], float]
    text: Optional[str] = None
    options: Optional[List[str]] = None
    explanation: Optional[str] = None

class TestAttemptScoring(BaseModel):
    score: float
    accuracy: float
    correct_count: int
    wrong_count: int
    unattempted_count: int
    partial_count: int = 0
