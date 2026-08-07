# Ball Jump and Run

Ein kleines Pygame-Projekt mit Doppelsprung, Rampen und Flug-Items.

## So startest du das Spiel

Windows:
1. Python 3 installieren
2. In diesem Ordner das Terminal öffnen
3. Abhängigkeiten installieren:
   `python -m pip install -r requirements.txt`
4. Spiel starten:
   `python main.py`

Alternativ kannst du auch die Datei `start_game.bat` doppelklicken.

## Spielanleitung

- Steuerung: Pfeiltasten links/rechts zum Bewegen
- Leertaste: Springen und in der Luft fliegen, wenn ein Flug-Item aktiv ist
- Ziel: Erreiche eine Distanz von 50000, um zu gewinnen
- Gefahr: Fällt der Ball in die Lava, endet das Spiel mit einem Game-Over
- Neustart: Nach einem Game Over oder Sieg kannst du den Neustart-Button drücken

## Hinweise

- Das Spiel benötigt Pygame.
- Wenn du das Spiel an andere weitergeben willst, sende den kompletten Ordner inklusive `main.py`, `requirements.txt` und `start_game.bat`.
