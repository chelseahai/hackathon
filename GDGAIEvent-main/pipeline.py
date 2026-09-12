"""
GDG AI Fashion Studio • End-to-End AI Fashion & Tailoring Pipeline
-------------------------------------------------------------------
Sequential Python implementation of the 6-stage fashion AI workflow:
1. Reference Object Calibration (pixels-to-cm)
2. Anthropometric Body Dimension Extraction (3D Ellipses)
3. 12-Season Personal Color Analysis (Skin/Undertone/HEX Swatches)
4. Silhouette, Cut & Pattern Styling Engine
5. Manufacturing Tech Pack Spec Sheet (POM & Ease Allowances)
6. Virtual Try-On Lookbook Render (Imagen 3)

Dependencies:
    pip install google-genai pydantic pillow
"""

import os
import io
import json
import math
from typing import List, Dict, Optional
from PIL import Image
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Initialize Gemini Client (reads GEMINI_API_KEY from environment)
client = genai.Client()


# =====================================================================
# STAGE 1: Reference Object Calibration (Scale Factor)
# =====================================================================

REFERENCE_SPECS = {
    "A4": {"name": "A4 Paper", "width_cm": 21.0, "height_cm": 29.7},
    "ID_CARD": {"name": "Credit / ID Card", "width_cm": 8.56, "height_cm": 5.398},
}

def calculate_pixels_per_cm(
    bbox_ymin: int,
    bbox_xmin: int,
    bbox_ymax: int,
    bbox_xmax: int,
    image_height_px: int,
    image_width_px: int,
    ref_type: str = "A4"
) -> float:
    """
    Converts Gemini normalized bounding box coordinates [0, 1000]
    to pixel dimensions, then computes pixels-per-centimeter scale.
    """
    ref = REFERENCE_SPECS.get(ref_type, REFERENCE_SPECS["A4"])
    
    # Denormalize coordinates to actual image pixel space
    pixel_h = (bbox_ymax - bbox_ymin) / 1000.0 * image_height_px
    pixel_w = (bbox_xmax - bbox_xmin) / 1000.0 * image_width_px
    
    # Scale based on vertical height
    pixels_per_cm = pixel_h / ref["height_cm"]
    return pixels_per_cm


def compute_ellipse_circumference(width_cm: float, depth_cm: float) -> float:
    """
    Computes 3D cross-sectional circumference (chest, waist, hips)
    from 2D front width and side depth using Ramanujan's formula.
    """
    a = width_cm / 2.0
    b = depth_cm / 2.0
    h = ((a - b) ** 2) / ((a + b) ** 2)
    circumference = math.pi * (a + b) * (1 + (3 * h) / (10 + math.sqrt(4 - 3 * h)))
    return round(circumference, 1)


# =====================================================================
# STAGE 2: Anthropometric Body Dimension Extraction
# =====================================================================

class BodyMeasurements(BaseModel):
    height_cm: float = Field(description="Total vertical stature in cm")
    shoulder_width_cm: float = Field(description="Bi-acromial shoulder span in cm")
    chest_circumference_cm: float = Field(description="Full bust/chest circumference in cm")
    waist_circumference_cm: float = Field(description="Natural waist circumference in cm")
    hip_circumference_cm: float = Field(description="Fullest hip circumference in cm")
    torso_length_cm: float = Field(description="High point shoulder to natural waist in cm")
    inseam_cm: float = Field(description="Crotch to ground/ankle in cm")
    arm_length_cm: float = Field(description="Shoulder to wrist in cm")
    body_shape_type: str = Field(description="Hourglass, Pear (Triangle), Rectangle, Inverted Triangle, or Apple")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0")

def extract_body_measurements(
    front_img_path: str,
    side_img_path: Optional[str] = None,
    ref_type: str = "A4"
) -> BodyMeasurements:
    """
    Extracts calibrated anthropometric measurements using Gemini 2.5 Flash
    multimodal vision with Structured Outputs.
    """
    ref = REFERENCE_SPECS.get(ref_type, REFERENCE_SPECS["A4"])
    
    front_img = Image.open(front_img_path)
    contents = [front_img]
    
    if side_img_path and os.path.exists(side_img_path):
        side_img = Image.open(side_img_path)
        contents.append(side_img)
        side_instruction = "Use the side image to compute exact 3D elliptical cross-sections for bust, waist, and hips."
    else:
        side_instruction = "Estimate anatomical depth using standard population anthropometric depth-to-width ratios."

    prompt = f"""
    You are an expert anthropometrist.
    1. Detect the reference object: {ref['name']} ({ref['width_cm']}cm x {ref['height_cm']}cm).
    2. Establish physical metric scale in centimeters.
    3. Measure height, shoulder width, chest, waist, hip, torso length, and inseam.
    4. {side_instruction}
    5. Classify the user's primary body shape.
    Return strictly JSON adhering to the schema.
    """
    contents.append(prompt)

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BodyMeasurements,
        ),
    )
    return BodyMeasurements.model_validate_json(response.text)


# =====================================================================
# STAGE 3: 12-Season Personal Color Analysis
# =====================================================================

class ColorSwatch(BaseModel):
    name: str = Field(description="Descriptive color name, e.g. Terracotta Rust")
    hex: str = Field(description="6-character hex code, e.g. #C85A32")

class AvoidColor(BaseModel):
    name: str
    reason: str

class ColorAnalysisResult(BaseModel):
    skin_tone_category: str = Field(description="e.g. Warm Medium with Golden Undertones")
    undertone: str = Field(description="Warm, Cool, or Neutral")
    contrast_level: str = Field(description="High, Medium, or Low Contrast")
    seasonal_palette: str = Field(description="12-Season palette, e.g. Warm Autumn, Cool Winter, Bright Spring")
    description: str
    best_colors: List[ColorSwatch] = Field(description="5 core flattering fabric colors with HEX")
    avoid_colors: List[AvoidColor] = Field(description="3 unflattering colors with rationale")

def perform_color_analysis(image_path: str) -> ColorAnalysisResult:
    """
    Performs 12-season personal colorimetry on facial tone, eye contrast,
    and hair hue to produce custom fabric color recommendations.
    """
    img = Image.open(image_path)
    prompt = """
    Analyze the person's skin tone, undertones, and contrast.
    Determine:
    1. Complexion undertone (Warm/Cool/Neutral).
    2. Value & contrast level between hair, eyes, and skin.
    3. 12-Season color analysis classification.
    4. 5 best complementary fabric color swatches with precise 6-character HEX codes.
    5. 3 colors to strictly avoid and why.
    """

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[img, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ColorAnalysisResult,
        ),
    )
    return ColorAnalysisResult.model_validate_json(response.text)


# =====================================================================
# STAGE 4: Silhouette, Pattern & Fabric Styling Engine
# =====================================================================

class GarmentStyling(BaseModel):
    silhouette_name: str
    key_features: List[str]
    recommended_fabrics: str
    pattern_advice: str

def recommend_silhouette_and_styling(
    measurements: BodyMeasurements,
    color_profile: ColorAnalysisResult
) -> GarmentStyling:
    """
    Recommends flattering dress cuts, necklines, hemlines, and prints
    matching the user's body shape and seasonal color profile.
    """
    prompt = f"""
    Fashion stylist task:
    User Profile:
    - Body Shape: {measurements.body_shape_type}
    - Measurements: Height {measurements.height_cm}cm, Shoulders {measurements.shoulder_width_cm}cm, Bust {measurements.chest_circumference_cm}cm, Waist {measurements.waist_circumference_cm}cm, Hips {measurements.hip_circumference_cm}cm.
    - Seasonal Color Palette: {color_profile.seasonal_palette} ({color_profile.undertone} undertones)
    - Primary Best Color: {color_profile.best_colors[0].name} ({color_profile.best_colors[0].hex})

    Provide:
    1. The single most flattering dress silhouette for this body type.
    2. 4 architectural garment cut features (neckline, waist cinch, sleeve, hemline).
    3. Recommended fabric drape and textiles.
    4. Pattern and print advice that harmonizes with their body geometry and colors.
    """

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GarmentStyling,
        ),
    )
    return GarmentStyling.model_validate_json(response.text)


# =====================================================================
# STAGE 5: Manufacturing Tech Pack Specification Sheet
# =====================================================================

class PointOfMeasure(BaseModel):
    pom: str
    body_cm: float
    ease_cm: float
    garment_spec_cm: float
    tolerance_cm: float
    notes: str

def generate_manufacturing_tech_pack(
    measurements: BodyMeasurements,
    styling: GarmentStyling
) -> List[PointOfMeasure]:
    """
    Generates factory-ready garment specifications with standard wearing ease
    allowances for pattern makers and production factories.
    """
    # Standard apparel ease guidelines (cm)
    specs = [
        PointOfMeasure(
            pom="Across Shoulder (Seam to Seam)",
            body_cm=measurements.shoulder_width_cm,
            ease_cm=1.5,
            garment_spec_cm=round(measurements.shoulder_width_cm + 1.5, 1),
            tolerance_cm=0.5,
            notes="Natural shoulder point to point"
        ),
        PointOfMeasure(
            pom="Bust Circumference (Fullest Point)",
            body_cm=measurements.chest_circumference_cm,
            ease_cm=4.0,
            garment_spec_cm=round(measurements.chest_circumference_cm + 4.0, 1),
            tolerance_cm=1.0,
            notes="Fitted bodice with bust shaping darts"
        ),
        PointOfMeasure(
            pom="Waist Circumference (Natural Waist)",
            body_cm=measurements.waist_circumference_cm,
            ease_cm=3.0,
            garment_spec_cm=round(measurements.waist_circumference_cm + 3.0, 1),
            tolerance_cm=1.0,
            notes="Contoured waist seam with self-fabric belt"
        ),
        PointOfMeasure(
            pom="Hip Circumference (Fullest Hip)",
            body_cm=measurements.hip_circumference_cm,
            ease_cm=8.0,
            garment_spec_cm=round(measurements.hip_circumference_cm + 8.0, 1),
            tolerance_cm=1.5,
            notes="Fluid flare sweep allowance"
        ),
        PointOfMeasure(
            pom="Total Garment Length (HPS to Hem)",
            body_cm=round(measurements.height_cm * 0.65, 1),
            ease_cm=0.0,
            garment_spec_cm=round(measurements.height_cm * 0.65, 1),
            tolerance_cm=1.0,
            notes="Midi length terminating mid-calf"
        ),
        PointOfMeasure(
            pom="Armhole Depth (Curved)",
            body_cm=21.0,
            ease_cm=2.5,
            garment_spec_cm=23.5,
            tolerance_cm=0.5,
            notes="Ergonomic armhole range of motion"
        ),
        PointOfMeasure(
            pom="Sleeve Length",
            body_cm=measurements.arm_length_cm * 0.75,
            ease_cm=1.0,
            garment_spec_cm=round(measurements.arm_length_cm * 0.75 + 1.0, 1),
            tolerance_cm=0.8,
            notes="Three-quarter finished cuff"
        )
    ]
    return specs


# =====================================================================
# STAGE 6: Virtual Try-On Render (Imagen 3)
# =====================================================================

def render_virtual_tryon(
    styling: GarmentStyling,
    color_profile: ColorAnalysisResult,
    measurements: BodyMeasurements,
    output_filename: str = "tryon_lookbook.jpg"
) -> str:
    """
    Synthesizes a photorealistic studio editorial lookbook photograph
    of the tailored garment rendered on the human using Imagen 3.
    """
    primary_color = color_profile.best_colors[0]
    
    prompt = (
        f"A high-end editorial fashion lookbook photograph of a female model with a "
        f"{measurements.body_shape_type} body profile, wearing an exquisitely tailored "
        f"{styling.silhouette_name}. The garment is crafted in luxurious {primary_color.name} "
        f"({primary_color.hex}) {styling.recommended_fabrics.split(',')[0]} fabric, featuring "
        f"{styling.pattern_advice}. Photographed in a prestigious fashion studio with soft natural "
        f"directional lighting, showing the exact drape, hemline, and waistline contour. "
        f"Ultra-crisp 8k lookbook photo, minimalist aesthetic."
    )

    print(f"Generating Imagen 3 Lookbook with prompt:\n{prompt}\n")

    result = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=prompt,
        config=types.GenerateImagesConfig(
            number_of_images=1,
            aspect_ratio="3:4",
            person_generation="ALLOW_ADULT",
        )
    )

    for generated_image in result.generated_images:
        image = Image.open(io.BytesIO(generated_image.image.image_bytes))
        image.save(output_filename)
        print(f"Saved lookbook render to: {output_filename}")
        return output_filename

    return ""


# =====================================================================
# MAIN PIPELINE EXECUTION
# =====================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("GDG AI FASHION STUDIO • END-TO-END PIPELINE RUNNER")
    print("=" * 70)

    # Replace with path to user's photo holding A4 paper or credit card
    sample_front_photo = "user_front.jpg"

    if os.path.exists(sample_front_photo):
        # 1 & 2. Body Dimensions
        print("\n--- STAGE 1 & 2: Extracting Body Dimensions ---")
        dims = extract_body_measurements(sample_front_photo, ref_type="A4")
        print(json.dumps(dims.model_dump(), indent=2))

        # 3. Color Analysis
        print("\n--- STAGE 3: Running Seasonal Color Analysis ---")
        colors = perform_color_analysis(sample_front_photo)
        print(json.dumps(colors.model_dump(), indent=2))

        # 4. Silhouette & Pattern Styling
        print("\n--- STAGE 4: Recommending Silhouette & Styling ---")
        styling = recommend_silhouette_and_styling(dims, colors)
        print(json.dumps(styling.model_dump(), indent=2))

        # 5. Tech Pack Spec Sheet
        print("\n--- STAGE 5: Generating Manufacturing Tech Pack ---")
        tech_pack = generate_manufacturing_tech_pack(dims, styling)
        for pom in tech_pack:
            print(f"  {pom.pom:35} Body: {pom.body_cm:5.1f}cm  Ease: +{pom.ease_cm:4.1f}cm  Finished: {pom.garment_spec_cm:5.1f}cm  Tol: ±{pom.tolerance_cm}cm")

        # 6. Virtual Try-On Render
        print("\n--- STAGE 6: Synthesizing Lookbook Render ---")
        render_virtual_tryon(styling, colors, dims)
    else:
        print(f"Note: '{sample_front_photo}' not found. To run with live images, provide a front photo holding an A4 paper or credit card.")
