# Carnet Français

An open-source website for French learners: free practice tools (flashcards,
conjugation drills, a placement quiz), course listings, suggested books,
contact details, and a showcase for the **CarnetTCF** app.

- No frameworks, no npm, no database. One Python script (standard library only) builds plain HTML.
- Runs happily on a Raspberry Pi behind nginx.
- MIT licensed.

## Edit the content

| What | File |
| --- | --- |
| Site name, phone numbers, email, address, app store links, social links | `content/site.json` |
| Courses | `content/courses.json` |
| Suggested books | `content/books.json` |
| Flashcards, verbs, quiz questions, phrases of the day | `content/learn.json` |
| Page text and layout | `templates/` |
| Styles / scripts | `static/css/style.css`, `static/js/app.js` |

In templates, `{{ key }}` inserts escaped text and `{{{ key }}}` inserts raw HTML.

## Build and preview locally

```bash
python3 build.py --serve     # http://localhost:8000
```

## Host on a Raspberry Pi

1. Clone: `git clone https://github.com/northern-light5/carnet-francais.git`
1. Make sure you can SSH in with a key: `ssh-copy-id pi@raspberrypi.local`
2. Copy the project to the Pi and run the one-time setup there:
   ```bash
   PI=pi@raspberrypi.local ./deploy/deploy.sh   # first run fails at the end; that's expected before setup
   ssh -t pi@raspberrypi.local 'cd french-site && sudo PORT=80 ./deploy/setup-pi.sh'
   ```
3. Every later update is one command from your computer:
   ```bash
   PI=pi@raspberrypi.local ./deploy/deploy.sh
   ```

Prefer Docker? `docker build -t carnet-francais . && docker run -d -p 8080:80 --restart unless-stopped carnet-francais`

## Contributing

Pull requests welcome: new vocabulary, quiz questions, book suggestions, translations and fixes.
