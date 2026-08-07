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

# Spielzustand
goal_distance = 5000
game_over = False
won = False
restart_button_rect = pygame.Rect(320, 260, 260, 60)
win_button_rect = pygame.Rect(320, 260, 260, 60)

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

# Schräge Rampen, die nicht über Lava liegen und in Abständen von 2000 bis 4000 vorkommen.
# (start_x, end_x, start_y, end_y)
ramps = []
next_ramp_x = 650

# Anzahl der zusätzlichen Sprünge nach dem ersten
extra_jumps = 1
jumps_left = extra_jumps

# Sammelbare Flug-Items
flight_items = []
has_flight = False
flight_timer = 0
flight_active = False


def is_safe_ramp(start_x, end_x):
    """True, wenn eine Rampe komplett über festem Boden liegt und nicht über Lava."""
    return not any(start <= x <= end for start, end in gaps for x in range(start_x, end_x + 1))


def spawn_ramps(target_x):
    """Erzeugt sichere Rampen und die dazugehörigen Flug-Items weiter vorne im Level."""
    global ramps, flight_items, next_ramp_x

    while next_ramp_x < target_x:
        start_x = next_ramp_x
        end_x = start_x + 150
        if is_safe_ramp(start_x, end_x):
            ramps.append((start_x, end_x, ground_y, ground_y - 100))
            flight_items.append((start_x + 75, ground_y - 140))
        next_ramp_x += random.randint(2000, 4000)

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


def get_surface_y(px):
    """Gibt die Höhe des Bodens oder einer Rampe an einer X-Position zurück."""
    for start_x, end_x, start_y, end_y in ramps:
        if start_x <= px <= end_x:
            if end_x == start_x:
                return start_y
            t = (px - start_x) / (end_x - start_x)
            return start_y + (end_y - start_y) * t
    return ground_y


def get_ramp_properties(px):
    """Gibt Steigung und Oberfläche einer Rampe an einer X-Position zurück."""
    for start_x, end_x, start_y, end_y in ramps:
        if start_x <= px <= end_x:
            if end_x == start_x:
                return 0.0, start_y
            slope = (end_y - start_y) / (end_x - start_x)
            return slope, start_y + slope * (px - start_x)
    return 0.0, ground_y


# Schon vor Spielstart einen Teil vom Level vorbereiten.
def reset_game():
    global x, y, vy, on_ground, last_safe_x, gaps, next_gap_start, ramps, next_ramp_x, flight_items
    global has_flight, flight_timer, flight_active, jumps_left, space_was_pressed, game_over, won

    x, y, vy = 120.0, 320.0, 0.0
    on_ground = False
    last_safe_x = x
    gaps = []
    next_gap_start = 450
    ramps = []
    next_ramp_x = 650
    flight_items = []
    has_flight = False
    flight_timer = 0
    flight_active = False
    jumps_left = extra_jumps
    space_was_pressed = False
    game_over = False
    won = False

    grow_level(2000)
    spawn_ramps(2000)


reset_game()
running = True

# Hauptschleife: laeuft 60-mal pro Sekunde.
while running:
    # Fenster schliessen?
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN and game_over:
            if restart_button_rect.collidepoint(event.pos):
                reset_game()

    if game_over:
        continue

    # Eingabe lesen
    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT]:
        x -= speed
    if keys[pygame.K_RIGHT]:
        x += speed

    # Links ist Schluss bei x = 0.
    x = max(0, x)  # nicht links aus der Welt laufen

    for item_x, item_y in list(flight_items):
        if abs(x - item_x) < r + 12 and abs(y - item_y) < r + 12:
            has_flight = True
            flight_timer = 240
            flight_items.remove((item_x, item_y))
            break

    if has_flight:
        if flight_timer > 0:
            flight_timer -= 1
        else:
            has_flight = False
            flight_active = False

    space_pressed = keys[pygame.K_SPACE]
    if space_pressed and not space_was_pressed:
        if on_ground:
            vy, on_ground = -jump, False
            jumps_left = extra_jumps
        elif has_flight and flight_timer > 0:
            flight_active = True
            vy = -jump * 0.7
            flight_timer = max(0, flight_timer - 20)
        elif jumps_left > 0:
            vy = -jump
            jumps_left -= 1
    elif has_flight and flight_timer > 0 and space_pressed and not on_ground:
        flight_active = True
        vy = max(vy - 0.45, -7.5)
        flight_timer = max(0, flight_timer - 1)
    else:
        flight_active = False
    space_was_pressed = space_pressed

    # Physik:
    # 1) Schwerkraft erhoeht vy
    # 2) vy veraendert y
    vy += gravity
    y += vy

    # Landen geht nur, wenn unter dem Ball Boden oder auf einer Rampe ist.
    surface_y = get_surface_y(x)
    ramp_slope, ramp_y = get_ramp_properties(x)
    if (not is_gap(x)) and (y + r >= surface_y):
        y, vy, on_ground, last_safe_x, jumps_left = surface_y - r, 0, True, x, extra_jumps
    else:
        on_ground = False

    if on_ground and abs(ramp_slope) > 0.0001:
        # Auf der Rampe rollt der Ball leicht nach unten.
        y = max(y, ramp_y - r)
        if vy > 0:
            vy = min(vy, 2.4)

    # Wenn der Ball tief faellt (Lava), auf letzte sichere Stelle setzen.
    if y - r > H:
        game_over = True
        continue

    if x >= goal_distance:
        won = True
        game_over = True
        continue

    # Immer neue Teile vom Level erzeugen, damit es endlos ist.
    grow_level(x + 4000)
    spawn_ramps(x + 4000)

    # Kamera:
    # Ball bleibt eher links im Bild, die Welt bewegt sich nach links.
    cam_x = max(0, x - 220)

    # Zeichnen
    screen.fill(SKY)

    # Der Boden wird zuerst als gruener Streifen gezeichnet.
    pygame.draw.rect(screen, GROUND, (0, ground_y, W, H - ground_y))

    # Danach kommen die Rampen als schräge Flächen.
    for start_x, end_x, start_y, end_y in ramps:
        points = [
            (start_x - cam_x, start_y),
            (end_x - cam_x, end_y),
            (end_x - cam_x, ground_y),
            (start_x - cam_x, ground_y),
        ]
        pygame.draw.polygon(screen, GROUND, points)

    if goal_distance > 0:
        goal_screen_x = goal_distance - cam_x
        if 0 <= goal_screen_x <= W:
            pygame.draw.rect(screen, (255, 215, 0), (goal_screen_x - 3, 300, 6, 130))
            pygame.draw.rect(screen, (255, 255, 255), (goal_screen_x - 20, 290, 40, 10))
            pygame.draw.rect(screen, (255, 255, 255), (goal_screen_x - 20, 420, 40, 10))

    # Danach kommen die Lava-Abgruende ueber den Boden.
    for start, end in gaps:
        dx, dw = start - cam_x, end - start
        if dx < W and dx + dw > 0:  # nur sichtbare Abgruende zeichnen
            pygame.draw.rect(screen, LAVA, (dx, ground_y, dw, H - ground_y))

    # Ball an Bildschirmposition zeichnen (Welt-X minus Kamera-X).
    pygame.draw.circle(screen, BALL, (int(x - cam_x), int(y)), r)

    # Flug-Items zeichnen.
    for item_x, item_y in flight_items:
        item_screen_x = item_x - cam_x
        if 0 <= item_screen_x <= W:
            pygame.draw.polygon(screen, (255, 215, 0), [
                (item_screen_x, item_y - 10),
                (item_screen_x + 8, item_y),
                (item_screen_x, item_y + 10),
                (item_screen_x - 8, item_y),
            ])

    # Kleine Texte als Hilfe.
    screen.blit(font.render("Pfeile: bewegen | Leertaste: springen / fliegen", True, TEXT), (14, 12))
    if has_flight and flight_timer > 0:
        screen.blit(font.render("Flug aktiv! Halte Leertaste fuer den Flug", True, TEXT), (14, 62))
    elif has_flight:
        screen.blit(font.render("Flug bereit!", True, TEXT), (14, 62))
    screen.blit(font.render(f"Distanz: {int(x)}", True, TEXT), (14, 38))

    if game_over:
        screen.fill((0, 0, 0))
        if won:
            title_font = pygame.font.SysFont(None, 110)
            subtitle_font = pygame.font.SysFont(None, 42)
            screen.blit(title_font.render("GEWONNEN!", True, (255, 215, 0)), (140, 120))
            screen.blit(subtitle_font.render("Du hast das Ziel erreicht!", True, (255, 255, 255)), (210, 240))
            screen.blit(subtitle_font.render("Super gemacht!", True, (170, 220, 255)), (310, 295))
        else:
            game_over_font = pygame.font.SysFont(None, 90)
            screen.blit(game_over_font.render("GAME OVER", True, (255, 0, 0)), (210, 180))
            screen.blit(font.render("Du bist in der Lava gelandet.", True, (255, 255, 255)), (235, 260))
        pygame.draw.rect(screen, (255, 255, 255), restart_button_rect, 2)
        pygame.draw.rect(screen, (255, 255, 255), restart_button_rect.inflate(8, 8), 2)
        screen.blit(font.render("Neustart", True, (255, 255, 255)), (370, 276))

    # Neues Bild anzeigen und auf 60 FPS begrenzen.
    pygame.display.flip()
    clock.tick(60)

# Sauber beenden.
pygame.quit()