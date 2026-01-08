import os

structure = {
    "src": {
        "index.js": None,
        "router.js": None,
        "response.js": None,
        "middleware": {
            "auth.js": None
        },
        "services": {
            "checkout.service.js": None,
            "payment.service.js": None,
            "order.service.js": None
        },
        "routes": {
            "checkout.routes.js": None,
            "payment.routes.js": None,
            "order.routes.js": None
        },
        "utils": {
            "paypal.js": None,
            "money.js": None
        }
    }
}

def create_structure(base_path, tree):
    for name, content in tree.items():
        path = os.path.join(base_path, name)
        if content is None:
            # Create empty file
            open(path, "w").close()
        else:
            # Create directory and recurse
            os.makedirs(path, exist_ok=True)
            create_structure(path, content)

create_structure(".", structure)

print("Project structure created successfully.")
