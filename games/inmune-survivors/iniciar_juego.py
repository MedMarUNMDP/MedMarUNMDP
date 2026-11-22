from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
import ipaddress
import socket
import sys
import webbrowser


folder = Path(__file__).resolve().parent
mobile_mode = "--mobile" in sys.argv
host = "0.0.0.0" if mobile_mode else "127.0.0.1"
port = 8000 if mobile_mode else 0
handler = partial(SimpleHTTPRequestHandler, directory=str(folder))
server = ThreadingHTTPServer((host, port), handler)
port = server.server_address[1]
url = f"http://127.0.0.1:{port}/?build=3.8.1"

print(f"Iniciando Inmune Survivors v3.8 en {url}", flush=True)
if mobile_mode:
    lan_ip = None
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("192.0.2.1", 1))
            candidate = probe.getsockname()[0]
            if ipaddress.ip_address(candidate).is_private:
                lan_ip = candidate
    except OSError:
        pass
    if lan_ip:
        print(f"En el celular, conectado al mismo Wi-Fi, abrí: http://{lan_ip}:{port}/?build=3.8.1", flush=True)
    else:
        print(f"En el celular, conectado al mismo Wi-Fi, abrí http://IP-DE-ESTA-PC:{port}/?build=3.8.1. Para ver la IP, ejecutá ipconfig y buscá Dirección IPv4.", flush=True)
    print("Dejá esta ventana abierta mientras jugás. Para cerrar el servidor, presioná Ctrl+C.", flush=True)
else:
    Timer(0.4, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
