import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk
import os
import re
import vdf

CONFIG_PATH = os.path.expanduser("~/.config/lsfg-vk/conf.toml")

class ConfigEditor(Gtk.Window):
    def __init__(self):
        Gtk.Window.__init__(self, title="lsfg-vk 설정 편집기")
        self.set_border_width(12)
        self.set_default_size(800, 600)

        self.config_lines = self.load_raw_config()
        self.game_entries = self.extract_game_entries()

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.add(main_box)

        self.notebook = Gtk.Notebook()
        main_box.pack_start(self.notebook, True, True, 0)
        self.pages = []
        self.build_all_tabs()

        button_box = Gtk.Box(spacing=10)
        
        add_btn = Gtk.Button(label="게임 추가")
        add_btn.connect("clicked", self.add_game_tab)
        button_box.pack_start(add_btn, False, False, 0)

        search_steam_games_btn = Gtk.Button(label="설치게임 검색")
        search_steam_games_btn.connect("clicked", self.on_search_steam_games_clicked)
        button_box.pack_start(search_steam_games_btn, False, False, 0)

        remove_btn = Gtk.Button(label="현재 게임 삭제")
        remove_btn.connect("clicked", self.remove_current_tab)
        button_box.pack_start(remove_btn, False, False, 0)
        
        save_btn = Gtk.Button(label="저장하기")
        save_btn.connect("clicked", self.save_config)
        button_box.pack_end(save_btn, False, False, 0)

        main_box.pack_start(button_box, False, False, 10)

    def load_raw_config(self):
        if not os.path.exists(CONFIG_PATH):
            return []
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                return f.readlines()
        except Exception as e:
            print(f"설정 파일 로드 중 오류 발생: {e}")
            return []

    def extract_game_entries(self):
        entries, current = [], {
            "exe": "", "multiplier": 2, "flow_scale": 1.0, "fps_limit": 48,
            "performance_mode": False, "hdr_mode": False, "mangohud": False,
            "steamdeck_compat": False,
            "present_mode": "fifo"
        }
        for line in self.config_lines:
            line = line.strip()
            if line.startswith("[[game]]"):
                if current["exe"]: entries.append(current.copy())
                current.update({
                    "exe": "", "multiplier": 2, "flow_scale": 1.0, "fps_limit": 48,
                    "performance_mode": False, "hdr_mode": False, "mangohud": False,
                    "steamdeck_compat": False,
                    "present_mode": "fifo"
                })
            elif line.startswith("exe ="):
                current["exe"] = line.split("=", 1)[1].strip().strip('"')
            elif line.startswith("multiplier ="):
                try:
                    current["multiplier"] = int(line.split("=", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("flow_scale ="):
                try:
                    current["flow_scale"] = float(line.split("=", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("experimental_fps_limit ="):
                try:
                    current["fps_limit"] = int(line.split("=", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("performance_mode ="):
                current["performance_mode"] = line.split("=", 1)[1].strip().lower() == "true"
            elif line.startswith("hdr_mode ="):
                current["hdr_mode"] = line.split("=", 1)[1].strip().lower() == "true"
            elif line.startswith("mangohud ="):
                current["mangohud"] = line.split("=", 1)[1].strip().lower() == "true"
            elif line.startswith("env ="):
                env_value = line.split("=", 1)[1].strip().strip('"')
                if env_value == "SteamDeck=1":
                    current["steamdeck_compat"] = True
                elif env_value == "SteamDeck=0":
                    current["steamdeck_compat"] = False
                else:
                    current["steamdeck_compat"] = False
            elif line.startswith("experimental_present_mode ="):
                current["present_mode"] = line.split("=", 1)[1].strip().strip('"')
            
        if current["exe"]: entries.append(current)
        return entries

    def build_all_tabs(self):
        for i in range(self.notebook.get_n_pages()):
            self.notebook.remove_page(0)
        self.pages = []
        for entry in self.game_entries:
            self.add_game_tab(entry)
            
        if not self.game_entries:
            self.add_game_tab()

    def add_game_tab(self, entry=None):
        data = {
            "exe": "", "multiplier": 2, "flow_scale": 1.0, "fps_limit": 48,
            "performance_mode": False, "hdr_mode": False, "mangohud": False,
            "steamdeck_compat": False,
            "present_mode": "fifo"
        }
        if isinstance(entry, dict):
            data.update(entry) 

        page = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        page.set_border_width(10)
        widgets = {}

        def add_row(label, widget):
            row = Gtk.Box(spacing=10)
            row.pack_start(Gtk.Label(label=label, xalign=0), False, False, 0)
            row.pack_start(widget, True, True, 0)
            page.pack_start(row, False, False, 0)

        widgets["exe"] = Gtk.Entry()
        widgets["exe"].set_text(data["exe"])
        
        copy_btn = Gtk.Button(label="복사")
        
        def on_copy_clicked(button, exe_entry_widget):
            full_path = exe_entry_widget.get_text()
            game_name = os.path.basename(full_path)
            
            text_to_copy = f'LSFG_PROCESS="{game_name}" %COMMAND%'
            
            clipboard = Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD)
            clipboard.set_text(text_to_copy, -1)
            clipboard.store()

        copy_btn.connect("clicked", on_copy_clicked, widgets["exe"])

        exe_input_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=5)
        exe_input_box.pack_start(widgets["exe"], True, True, 0)
        exe_input_box.pack_start(copy_btn, False, False, 0)

        add_row("게임 이름 (exe):", exe_input_box)

        widgets["steamdeck_compat"] = Gtk.CheckButton(label="Steam Deck 호환 모드 (SteamDeck=1/0)");
        widgets["steamdeck_compat"].set_active(data["steamdeck_compat"])
        page.pack_start(widgets["steamdeck_compat"], False, False, 0)
        
        combo = Gtk.ComboBoxText()
        present_modes = ["fifo", "immediate", "mailbox", "relaxed"]
        for mode in present_modes: combo.append_text(mode)
        combo.set_active(present_modes.index(data["present_mode"]) if data["present_mode"] in present_modes else 0)
        widgets["present_mode"] = combo
        add_row("Present Mode:", combo)

        widgets["multiplier"] = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 1, 4, 1)
        widgets["multiplier"].set_value(data["multiplier"]); widgets["multiplier"].set_digits(0)
        add_row("multiplier:", widgets["multiplier"])

        widgets["flow_scale"] = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.25, 1.0, 0.05)
        widgets["flow_scale"].set_value(data["flow_scale"]); widgets["flow_scale"].set_digits(2)
        add_row("flow_scale:", widgets["flow_scale"])

        widgets["fps_limit"] = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 144, 1)
        widgets["fps_limit"].set_value(data["fps_limit"]); widgets["fps_limit"].set_digits(0)
        add_row("FPS 제한:", widgets["fps_limit"])

        for key, label in [("performance_mode", "Performance Mode"),
                            ("hdr_mode", "HDR Mode"),
                            ("mangohud", "MangoHud 표시")]:
            check = Gtk.CheckButton(label=label); check.set_active(data[key])
            widgets[key] = check
            page.pack_start(check, False, False, 0)

        self.notebook.append_page(page, Gtk.Label(label=data["exe"] or "새 게임"))
        self.pages.append(widgets)
        self.notebook.show_all()
        self.notebook.set_current_page(len(self.pages) - 1)

    def remove_current_tab(self, _):
        page_num = self.notebook.get_current_page()
        if page_num >= 0:
            self.notebook.remove_page(page_num)
            self.pages.pop(page_num)
            if not self.pages:
                self.add_game_tab()

    def save_config(self, _):
        config_dir = os.path.dirname(CONFIG_PATH)
        if not os.path.exists(config_dir):
            os.makedirs(config_dir)

        new_lines = [
            "version = 1\n",
            "[global]\n",
            '# override the location of Lossless Scaling\n',
            '# dll = "/games/Lossless Scaling"\n\n'
        ]

        for widgets in self.pages:
            exe = widgets["exe"].get_text().strip()
            if not exe:
                continue

            mult = int(widgets["multiplier"].get_value())
            flow = widgets["flow_scale"].get_value()
            fps = int(widgets["fps_limit"].get_value())
            perf = "true" if widgets["performance_mode"].get_active() else "false"
            hdr = "true" if widgets["hdr_mode"].get_active() else "false"
            mango = "true" if widgets["mangohud"].get_active() else "false"
            
            if widgets["steamdeck_compat"].get_active():
                env = "SteamDeck=1"
            else:
                env = "SteamDeck=0"

            present = widgets["present_mode"].get_active_text()

            new_lines.extend([
                "[[game]]\n",
                f'exe = "{exe}"\n',
                f"multiplier = {mult}\n",
                f"flow_scale = {flow:.2f}\n",
                f"experimental_fps_limit = {fps}\n",
                f"performance_mode = {perf}\n",
                f"hdr_mode = {hdr}\n",
                f"mangohud = {mango}\n",
            ])
            new_lines.append(f'env = "{env}"\n')
            
            new_lines.append(f'experimental_present_mode = "{present}"\n')
            new_lines.append("\n")

        try:
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            print(f"설정이 성공적으로 저장되었습니다: {CONFIG_PATH}")
            dialog = Gtk.MessageDialog(
                parent=self,
                flags=0,
                message_type=Gtk.MessageType.INFO,
                buttons=Gtk.ButtonsType.OK,
                text="저장 완료",
            )
            dialog.format_secondary_text(f"설정 파일이 성공적으로 저장되었습니다:\n{CONFIG_PATH}")
            dialog.run()
            dialog.destroy()

        except Exception as e:
            print(f"설정 저장 중 오류 발생: {e}")
            dialog = Gtk.MessageDialog(
                parent=self,
                flags=0,
                message_type=Gtk.MessageType.ERROR,
                buttons=Gtk.ButtonsType.OK,
                text="저장 실패",
            )
            dialog.format_secondary_text(f"설정 파일 저장 중 오류가 발생했습니다:\n{e}\n\n권한 문제일 수 있습니다.")
            dialog.run()
            dialog.destroy()

    def find_steam_library_folders(self):
        steam_root_path = os.path.expanduser("~/.steam/steam")
        libraryfolders_vdf_path = os.path.join(steam_root_path, "steamapps", "libraryfolders.vdf")

        library_paths = []

        default_common_path = os.path.join(steam_root_path, "steamapps", "common")
        if os.path.isdir(default_common_path):
            library_paths.append(default_common_path)

        if os.path.exists(libraryfolders_vdf_path):
            try:
                with open(libraryfolders_vdf_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    try:
                        vdf_data = vdf.loads(content)
                        for key, value in vdf_data.get('libraryfolders', {}).items():
                            if isinstance(value, dict) and 'path' in value:
                                path = value['path']
                                path = path.replace('\\\\', os.sep).replace('\\', os.sep)
                                common_path = os.path.join(path, "steamapps", "common")
                                if os.path.isdir(common_path) and common_path not in library_paths:
                                    library_paths.append(common_path)
                    except Exception as parse_error:
                        print(f"Failed to parse libraryfolders.vdf with vdf library, falling back to regex: {parse_error}")
                        paths = re.findall(r'"path"\s+"([^"]+)"', content)
                        for path in paths:
                            path = path.replace('\\\\', os.sep).replace('\\', os.sep)
                            common_path = os.path.join(path, "steamapps", "common")
                            if os.path.isdir(common_path) and common_path not in library_paths:
                                library_paths.append(common_path)

            except Exception as e:
                print(f"Error reading libraryfolders.vdf: {e}")
        
        return library_paths

    def get_installed_steam_games(self):
        game_names = set()
        library_folders = self.find_steam_library_folders()

        for lib_path in library_folders:
            games_common_path = lib_path
            
            if os.path.isdir(games_common_path):
                for item in os.listdir(games_common_path):
                    game_dir = os.path.join(games_common_path, item)
                    if os.path.isdir(game_dir):
                        game_names.add(item) 
        
        return sorted(list(game_names))

    def on_search_steam_games_clicked(self, button):
        installed_games = self.get_installed_steam_games()
        
        if not installed_games:
            dialog = Gtk.MessageDialog(
                parent=self,
                flags=0,
                message_type=Gtk.MessageType.INFO,
                buttons=Gtk.ButtonsType.OK,
                text="설치된 Steam 게임 없음",
            )
            dialog.format_secondary_text("Steam 라이브러리 폴더에서 설치된 게임을 찾을 수 없습니다.")
            dialog.run()
            dialog.destroy()
            return

        selection_dialog = Gtk.Dialog(
            title="게임 선택",
            parent=self,
            flags=0,
            buttons=(Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
                     Gtk.STOCK_ADD, Gtk.ResponseType.OK)
        )
        selection_dialog.set_default_size(400, 300)

        scrolled_window = Gtk.ScrolledWindow()
        scrolled_window.set_vexpand(True)
        scrolled_window.set_hexpand(True)
        selection_dialog.get_content_area().pack_start(scrolled_window, True, True, 0)

        game_list_box = Gtk.ListBox()
        game_list_box.set_selection_mode(Gtk.SelectionMode.NONE)
        scrolled_window.add(game_list_box)

        checkboxes = {}

        existing_exes = {self.pages[i]["exe"].get_text().strip() for i in range(self.notebook.get_n_pages())}

        for game_name in installed_games:
            row_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
            checkbox = Gtk.CheckButton(label=game_name)
            
            if game_name in existing_exes:
                checkbox.set_active(True)
                checkbox.set_sensitive(False)
            
            checkboxes[game_name] = checkbox
            row_box.pack_start(checkbox, False, False, 0)
            game_list_box.add(row_box)

        selection_dialog.show_all()
        response = selection_dialog.run()

        added_count = 0
        if response == Gtk.ResponseType.OK:
            for game_name, checkbox in checkboxes.items():
                if checkbox.get_active() and checkbox.get_sensitive():
                    self.add_game_tab(entry={"exe": game_name})
                    added_count += 1
        
        selection_dialog.destroy()

        if added_count > 0:
            dialog = Gtk.MessageDialog(
                parent=self,
                flags=0,
                message_type=Gtk.MessageType.INFO,
                buttons=Gtk.ButtonsType.OK,
                text="Steam 게임 추가 완료",
            )
            dialog.format_secondary_text(f"{added_count}개의 새 게임이 추가되었습니다.")
            dialog.run()
            dialog.destroy()
        elif response == Gtk.ResponseType.OK:
            dialog = Gtk.MessageDialog(
                parent=self,
                flags=0,
                message_type=Gtk.MessageType.INFO,
                buttons=Gtk.ButtonsType.OK,
                text="게임 없음",
            )
            dialog.format_secondary_text("새로운 게임이 추가되지 않았습니다.")
            dialog.run()
            dialog.destroy()

if __name__ == "__main__":
    win = ConfigEditor()
    win.connect("destroy", Gtk.main_quit)
    win.show_all()
    Gtk.main()