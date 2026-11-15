"""PreToolUse (Edit|Write): bloquea escrituras que contengan secretos o que toquen .secrets/.

Exit 2 = bloquear; el mensaje de stderr vuelve a Claude.
"""
import json
import re
import sys

PATTERNS = [
    (r"sb_secret_[A-Za-z0-9_\-]{8,}", "secret key de Supabase (sb_secret_…)"),
    (r"GOCSPX-[A-Za-z0-9_\-]{8,}", "client secret de Google OAuth"),
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----", "clave privada"),
    (r"eyJhbGciOi[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]*cm9sZSI6InNlcnZpY2Vfcm9sZS", "JWT service_role de Supabase"),
    (r"1//0[A-Za-z0-9_\-]{30,}", "refresh token de Google"),
]


def main() -> int:
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8-sig", errors="replace"))
    except Exception:
        return 0
    tool_input = data.get("tool_input") or {}
    path = str(tool_input.get("file_path") or "").replace("\\", "/")

    if "/.secrets/" in path or path.endswith("/.env") or path.endswith("/.env.local"):
        print(f"Bloqueado: {path} es un archivo de secretos; editalo a mano.", file=sys.stderr)
        return 2

    text = "\n".join(
        str(tool_input.get(k) or "") for k in ("content", "new_string")
    )
    for edit in tool_input.get("edits") or []:
        text += "\n" + str(edit.get("new_string") or "")

    for pattern, label in PATTERNS:
        if re.search(pattern, text):
            print(
                f"Bloqueado: el contenido incluye un/una {label}. Los secretos van en los "
                "secrets de Supabase (Edge Functions) o en .secrets/, nunca en el código.",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
