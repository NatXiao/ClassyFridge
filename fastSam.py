import math

import cv2
from ultralytics import FastSAM

DEBUGGING = True
MODELS_PATH = "models"
IMG_SIZE = 224
DEBUGGING_DIR = "debugging_images"
RESIZE = False

def get_fast_sam(model):
    return FastSAM(MODELS_PATH + "/" + model)

# remove inner masks from the results
def remove_inner_masks(result):
    if result.masks is None:
        return result

    # convert masks to binary masks (True for mask pixels, False for background)
    masks = result.masks.data > 0.5

    # check larger masks first because a inner mask will always be smaller than its outer mask
    areas = masks.flatten(1).sum(dim=1)
    indices_by_area = areas.argsort(descending=True).tolist()

    kept_indices = []

    for index in indices_by_area:
        candidate = masks[index]

        # check if the candidate mask is inside any of the already kept masks
        is_inside_another_mask = any(
            not (candidate & ~masks[outer_index]).any().item()
            for outer_index in kept_indices
        )

        # if the candidate mask is not inside another one, we keep it
        if not is_inside_another_mask:
            kept_indices.append(index)

    # sort the kept indices to maintain the original order of the masks
    kept_indices.sort()

    # keep only masks and boxes that are not inner masks
    return result[kept_indices]

# resize the cropped images to the same size as the input of the classification model
def resize_image(image, target_size=(IMG_SIZE, IMG_SIZE)):
    original_height, original_width = image.shape[:2]
    target_width, target_height = target_size

    # scaling factors
    scale_width = target_width / original_width
    scale_height = target_height / original_height

    scale = min(scale_width, scale_height)

    # new dimensions
    new_width = max(1, round(original_width * scale))
    new_height = max(1, round(original_height * scale))

    # Resize the image
    resized_image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)

    return resized_image

# crop the image and return a list of cropped images that will be given to the classification model
def crop_boxes(image, boxes):

    image_height, image_width = image.shape[:2]
    cropped_images = []

    # An Ultralytics Boxes object contains metadata in addition to its
    # coordinates. The xyxy property is the (x1, y1, x2, y2) tensor.
    coordinates = boxes.xyxy if hasattr(boxes, "xyxy") else boxes

    for box in coordinates:
        # FastSAM coordinates are floating-point tensors. NumPy image slices
        # require integer indices.
        x1, y1, x2, y2 = box.detach().cpu().tolist()

        x1 = max(0, math.floor(x1))
        y1 = max(0, math.floor(y1))
        x2 = min(image_width, math.ceil(x2))
        y2 = min(image_height, math.ceil(y2))

        # add padding to the cropped image to avoid cutting off parts of the object
        padding = 10  # pixels
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(image_width, x2 + padding)
        y2 = min(image_height, y2 + padding)

        cropped_image = image[y1:y2, x1:x2]
        if RESIZE:
            cropped_image = resize_image(cropped_image)
        cropped_images.append(cropped_image)
        

    return cropped_images


if __name__ == "__main__":
    model = get_fast_sam("FastSAM-x.pt")
    img = "models_evaluation/data/fastSAM/food2.jpg"

    results = model(
        img,
        retina_masks=True,
        imgsz=1024,
        conf=0.8,
        iou=0.5,
    )

    if DEBUGGING:
        annotated_image = results[0].plot(
            boxes=True, masks=True, labels=True
        )
        cv2.imshow(
            f"Before removing inner masks - {len(results[0].boxes)} objects",
            annotated_image,
        )

    # Remove inner masks and the matching boxes together. All per-object data
    # in an Ultralytics Results instance must keep the same indices.
    results[0] = remove_inner_masks(results[0])

    if DEBUGGING:
        annotated_image = results[0].plot(
            boxes=True, masks=True, labels=True
        )
        cv2.imshow(
            f"After removing inner masks - {len(results[0].boxes)} objects",
            annotated_image,
        )

        # Keep both windows open until a key is pressed, then close them.
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    # crop images 
    if DEBUGGING:
        cropped_images = crop_boxes(cv2.imread(img), results[0].boxes)
        for i, cropped_image in enumerate(cropped_images):
            cv2.imwrite(f"{DEBUGGING_DIR}/cropped_image_{i + 1}.jpg", cropped_image)
            cv2.imshow(f"Cropped image {i + 1}", cropped_image)

        # Keep both windows open until a key is pressed, then close them.
        cv2.waitKey(0)
        cv2.destroyAllWindows()

