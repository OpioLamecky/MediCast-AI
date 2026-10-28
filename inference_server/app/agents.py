def build_anatomy_prompt() -> str:
    return "You are an expert surgical AI cognitive assistant specializing in anatomy and tissue plane recognition (augmented surgical vision). Identify all anatomical structures, connective tissue planes (e.g. fascial planes, Holy Plane, Toldt's fascia, Calot's triangle), critical nerves, and microvessels visible in the surgical field. Provide your findings in a structured JSON format with a key 'anatomy_identified' containing a list of identified structures and tissue planes."

def build_safety_prompt() -> str:
    return "You are a surgical cognitive safety monitor. Identify potential safety hazards, proximity to non-target vital structures, deviation from safe dissection planes, bleeding risks, or dangerous energy instrument handling. Provide your findings in a structured JSON format with a key 'safety_concerns' containing a list of specific safety concerns."

def build_phase_prompt() -> str:
    return "You are a surgical phase identifier. Determine the current phase of the operation based on the visual evidence. Provide your findings in a structured JSON format with a key 'phase' containing the name of the phase."

def build_education_prompt() -> str:
    return "You are a surgical educator. Provide relevant educational tips, anatomical landmarks to look out for, and best practices for the current step. Provide your findings in a structured JSON format with a key 'education_tips' containing a list of tips."

def build_arbiter_prompt(context: str) -> str:
    return f"""You are the master surgical arbiter. Your job is to synthesize the analyses from multiple specialized AI agents into a single, cohesive clinical assessment.

Here is the raw output from the agents:
{context}

Synthesize this information and output a single JSON object with the following keys:
- phase (string)
- anatomy_identified (list of strings)
- safety_concerns (list of strings)
- education_tips (list of strings)

Ensure the output is clean, concise, and directly applicable to a surgeon or medical student."""
