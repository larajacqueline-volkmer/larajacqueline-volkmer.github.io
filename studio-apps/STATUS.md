# Projektprüfung vom 22. November 2026

Sechs App-Kopien wurden aus vorhandenen Quellen zusammengestellt. Alle sechs bestanden den mobilen Chromium-Test mit 390 × 844 Pixeln, Offline-Neuladen nach dem Erstaufruf und PNG-Iconprüfung. Das prüft die genannten Hauptfunktionen. Eine vollständige Prüfung aller Menüs und Sonderfälle steht aus.

| Projekt | Geprüfte Hauptfunktion | Quellen und Änderungen |
| --- | --- | --- |
| Memoria | Demo-Deck, Antwort zeigen, Bewertung und XP | Core-Full-Oberfläche, Plus-Full-Lernlogik, separates Iconpaket. Syntaxfehler behoben. PDF-Seite auf lokale Browser-Vorschau begrenzt. |
| PianoFlow AI | Demo-Wiedergabe, Fortschritt, Pause | Functional GitHub Final. Bild komprimiert und PNG-App-Icons ergänzt. |
| Chess Strategic | Zweispielermodus, e2–e4, Rücknahme | Mockup Board Final V2. Mobile Steuerung und Scrollverhalten korrigiert. |
| Portal Run | Spielstart, Punkte, Touch-Steuerung | Vier bytegleiche HTML-Sicherungen. Bilder ausgelagert und komprimiert. |
| Mindmap Studio | Knoten erstellen, umbenennen, speichern, neu laden, Undo | Canvas-Logik aus LocalAccounts-Paket und Gestaltung aus Cloud-Pro-Paket. Neue lokale Minimaloberfläche mit Touch-Steuerung. |
| Vicara | Wort hinzufügen, Lernkarte umdrehen | vicara_project-Sicherung. Eingaben in HTML-Ausgaben zusätzlich maskiert. |

## Umfang der Bestandsaufnahme

Die Google-Drive-Verzeichnisaufnahme erfasste 4.225 Ordner und 56.009 Einträge. Der Filter lieferte 1.154 mögliche Code-/Archivdateien. Diese Zahlen bezeichnen Dateien und Verzeichnisse. Der Quelltext aller Kandidaten wurde noch nicht vollständig untersucht.

Lokal wurden 25 Dateien aus der ersten Auswahl anhand von SHA-256 geprüft. Darin sind 20 verschiedene Inhalte enthalten, einschließlich eines Datenexports. Hinzu kommen vier identische Portal-Run-Dateien und zwei ergänzende PianoFlow-/Schacharchive. Damit wurden 31 Quelldateien mit 23 unterschiedlichen Inhalten geprüft. Zusätzliche Quellordner und Archive können weitere Versionen enthalten.

In diesen Inhalten sind mindestens neun eigenständige Projektfamilien belegt. Sechs wurden veröffentlicht. Weitere drei sind Brain/Notizen, StudyTown3D und Portfolio-Lara. Bei ihnen fehlen in diesem Durchlauf die vollständigen Laufzeit-, Funktions- und Abhängigkeitsprüfungen. Eine genaue Restdauer wurde nicht ermittelt.

In OneDrive wurde GECODED erreichbar bestätigt. Die erste Liste umfasst 200 Einträge und ist begrenzt. Die vorherigen Gesamtabfragen über Composio endeten mit Timeouts. Namen deuten auf zusätzliche Projekte wie Focus Timer, AI Study Quiz, Snake und BlockAdventure hin. Ihre Eigenständigkeit und Versionen sind noch durch Inhaltsvergleich zu prüfen.

Eine abschließende Gesamtzahl aller Coding-Projekte über beide Speicher ist offen.

## Veröffentlichung und Abgrenzungen

Die sechs Apps liegen gemeinsam unter studio-apps im bestehenden Portfolio-Repository. Diese Ablage wurde für die gemeinsame Übersicht gewählt. Jede App hat ein eigenes Manifest, einen auf ihren Pfad begrenzten Service Worker und eine README.

Mindmap Studio verwendet lokale Speicherung. Die umfangreichen Account-/Cloud-Erweiterungen der Quelle wurden nicht in diese neue App-Kopie übernommen. Memoria verwendet beim PDF-Öffnen den Viewer des Browsers. OCR und PDF-Zusammenfassung sind in dieser Kopie offen. Für beide Projekte gelten diese bewusst gewählten Minimalumfänge.

Die Originalquellen in Google Drive und OneDrive wurden durch diesen Auftrag ausschließlich gelesen.

## Ergänzung StudyTown 3D

StudyTown 3D wurde als siebte App ergänzt. Der mobile Chromium-Test prüfte den Start der WebGL-Szene, die Modulauswahl, Speichern und Wiederladen von Notizen sowie Checklisten und den Offline-Start. Der vollständige Testlauf für alle sieben Apps war erfolgreich.

Die Kamera-Initialisierung und defekten Bibliotheksverweise der Vorlage wurden korrigiert. Bibliotheken werden lokal geladen. Eine zusätzliche Modulauswahl macht Gebäude auf kleinen Displays erreichbar. Avatar-Platzhalter wurden durch einfache selbst erstellte Symbole ersetzt. Die App startet mit unbestätigten Modulfortschritten. Die älteren Modulnamen der Quelle müssen mit der aktuellen Prüfungsordnung abgeglichen werden.

Chess fängt nun beschädigte gespeicherte Listen ab. Piano pausiert bei Wechsel der App in den Hintergrund.

Ein eigenständiges AI-Chatbot-Projekt konnte aus den bisherigen Suchtreffern nicht eindeutig bestimmt werden. Ein Dateiname oder Projektlink wird für die Zuordnung benötigt. Die Brain App ist laut ihren Quelldaten ein lokaler Wissensbereich und wurde nicht als Chatbot veröffentlicht.
