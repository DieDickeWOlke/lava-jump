"""Mini-Jump-and-Run (Lernbeispiel fuer Pygame).

Steuerung:
- Pfeil links/rechts: laufen
- Leertaste: springen

Idee:
Du bist ein Ball und laeufst nach rechts. Im Boden sind zufaellige Lava-Abgruende,
die immer ueberspringbar bleiben. Das Level waechst endlos nach rechts.
"""

import random
import pygame

# Startet Pygame (Fenster, Tastatur, Zeitmessung usw.).
pygame.init()

# Groesse des Spielfensters in Pixeln.
W, H = 900, 520

# Erzeugt das Fenster.
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("Ball Jump and Run")

# clock hilft, das Spiel auf eine feste Bildrate zu begrenzen.
clock = pygame.time.Clock()

# Schrift fuer kurze Infos oben links.
font = pygame.font.SysFont(None, 28)

# Farben (R, G, B)
SKY, GROUND, LAVA, BALL, TEXT = (170, 220, 255), (70, 170, 70), (235, 70, 20), (0, 255, 0), (30, 30, 30)

# Spielerwerte:
# r = Radius vom Ball
# x, y = Position in der Welt
# vy = Geschwindigkeit nach oben/unten
r = 18
x, y, vy = 120.0, 320.0, 0.0   # Position und Fall-/Sprunggeschwindigkeit

# speed = Tempo links/rechts
# jump = Sprungstaerke
# gravity = Schwerkraft pro Bild
speed, jump, gravity = 5.0, 13.0, 0.6

# ground_y = Hoehe vom Boden
# on_ground = steht der Ball gerade auf dem Boden?
# last_safe_x = letzte sichere Stelle ohne Lava
ground_y, on_ground, last_safe_x = 430, False, x

# Jeder Abgrund ist ein Tupel: (start_x, end_x)
gaps, next_gap_start = [], 450

# Anzahl der Doppelsprünge
jumps_left = 2 

def grow_level(target_x):
    """Erzeugt so lange neue Abgruende, bis das Level weit genug reicht."""
    global next_gap_start

    # Solange wir noch nicht weit genug in die Zukunft erzeugt haben:
    while next_gap_start < target_x:
        # Breite vom Abgrund: klein genug, damit man springen kann.
        gap_w = random.randint(80, 125)
        gap_end = next_gap_start + gap_w
        gaps.append((next_gap_start, gap_end))

        # Abstand bis zum naechsten Abgrund:
        # weder direkt daneben noch extrem weit weg.
        next_gap_start = gap_end + random.randint(220, 380)


#
def is_gap(px):
    """True, wenn an der X-Position kein Boden ist."""

    # any(...) ist True, sobald EIN passender Abgrund gefunden wird.
    return any(start <= px <= end for start, end in gaps)


# Schon vor Spielstart einen Teil vom Level vorbereiten.
grow_level(2000)
running = True

# Hauptschleife: laeuft 60-mal pro Sekunde.
while running:
    # Fenster schliessen?
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Eingabe lesen
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        x -= speed
    if keys[pygame.K_RIGHT]:
        x += speed

    # Links ist Schluss bei x = 0.
    x = max(0, x)  # nicht links aus der Welt laufen

    # Springen nur vom Boden aus
    if keys[pygame.K_SPACE] and on_ground:
        vy, on_ground = -jump, False

    # Physik:
    # 1) Schwerkraft erhoeht vy
    # 2) vy veraendert y
    vy += gravity
    y += vy

    # Landen geht nur, wenn unter dem Ball Boden ist (kein Abgrund).
    if (not is_gap(x)) and (y + r >= ground_y):
        y, vy, on_ground, last_safe_x = ground_y - r, 0, True, x
    else:
        on_ground = False

    # Wenn der Ball tief faellt (Lava), auf letzte sichere Stelle setzen.
    if y - r > H:
        x, y, vy, on_ground = max(0, last_safe_x - 20), ground_y - r, 0, True

    # Immer neue Teile vom Level erzeugen, damit es endlos ist.
    grow_level(x + 2000)

    # Kamera:
    # Ball bleibt eher links im Bild, die Welt bewegt sich nach links.
    cam_x = max(0, x - 220)

    # Zeichnen
    screen.fill(SKY)

    # Der Boden wird zuerst als gruener Streifen gezeichnet.
    pygame.draw.rect(screen, GROUND, (0, ground_y, W, H - ground_y))

    # Danach kommen die Lava-Abgruende ueber den Boden.
    for start, end in gaps:
        dx, dw = start - cam_x, end - start
        if dx < W and dx + dw > 0:  # nur sichtbare Abgruende zeichnen
            pygame.draw.rect(screen, LAVA, (dx, ground_y, dw, H - ground_y))

    # Ball an Bildschirmposition zeichnen (Welt-X minus Kamera-X).
    pygame.draw.circle(screen, BALL, (int(x - cam_x), int(y)), r)

    # Kleine Texte als Hilfe.
    screen.blit(font.render("Pfeile: bewegen | Leertaste: springen", True, TEXT), (14, 12))
    screen.blit(font.render(f"Distanz: {int(x)}", True, TEXT), (14, 38))

    # Neues Bild anzeigen und auf 60 FPS begrenzen.
    pygame.display.flip()
    clock.tick(60)

# Sauber beenden.
pygame.quit()