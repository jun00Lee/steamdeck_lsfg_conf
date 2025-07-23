import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gdk, GLib
import os
import re
import requests
import json
import shutil
import threading # Added for multithreading

class FSRChangerWindow(Gtk.Window):
    def __init__(self):
        super().__init__(title="Steam Deck FSR Changer")
        self.set_default_size(500, 300)
        self.set_border_width(10)

        self.fsr_dll_filename = "amd_fidelityfx_dx12.dll"
        self.latest_fsr_version = "로딩 중..."
        self.latest_fsr_download_url = None

        # Main vertical box
        main_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.add(main_vbox)

        # Game search section
        game_search_hbox = Gtk.Box(spacing=5)
        main_vbox.pack_start(game_search_hbox, False, False, 0)

        self.game_path_entry = Gtk.Entry()
        self.game_path_entry.set_placeholder_text("게임 설치 폴더 경로")
        game_search_hbox.pack_start(self.game_path_entry, True, True, 0)

        game_search_button = Gtk.Button(label="게임 검색")
        game_search_button.connect("clicked", self.on_game_search_clicked)
        game_search_hbox.pack_start(game_search_button, False, False, 0)

        # FSR Version Display and Install Button
        fsr_install_hbox = Gtk.Box(spacing=5)
        main_vbox.pack_start(fsr_install_hbox, False, False, 0)

        self.fsr_version_label = Gtk.Label(label=f"{self.latest_fsr_version}")
        self.fsr_version_label.set_halign(Gtk.Align.START)
        fsr_install_hbox.pack_start(self.fsr_version_label, True, True, 0)

        self.fsr_install_button = Gtk.Button(label="설치")
        self.fsr_install_button.set_sensitive(False)
        self.fsr_install_button.connect("clicked", self.on_install_fsr_clicked)
        fsr_install_hbox.pack_start(self.fsr_install_button, False, False, 0)

        # Fetch FSR version on startup
        self.fetch_latest_fsr_version()

    def fetch_latest_fsr_version(self):
        repo_url = "https://api.github.com/repos/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK/contents/PrebuiltSignedDLL"
        
        try:
            response = requests.get(repo_url, timeout=5)
            response.raise_for_status()
            contents = response.json()

            found_dll = False
            for item in contents:
                if item['name'] == self.fsr_dll_filename and item['type'] == 'file':
                    self.latest_fsr_version = "AMD FidelityFX SDK 1.1.4"
                    self.latest_fsr_download_url = item['download_url']
                    found_dll = True
                    break
            
            if found_dll:
                self.fsr_version_label.set_text(f"{self.latest_fsr_version}")
                if self.game_path_entry.get_text() and os.path.isdir(self.game_path_entry.get_text()):
                     self.fsr_install_button.set_sensitive(True) 
            else:
                self.fsr_version_label.set_text("DLL을 찾을 수 없음")
                self.show_message_dialog("오류", "GitHub에서 FSR DLL 정보를 가져올 수 없습니다.", Gtk.MessageType.ERROR)
                
        except requests.exceptions.RequestException as e:
            self.fsr_version_label.set_text(f"로드 실패 ({e})")
            print(f"Failed to fetch FSR version: {e}")
        except Exception as e:
            self.fsr_version_label.set_text(f"로드 오류 ({e})")
            print(f"An unexpected error occurred: {e}")

    def on_game_search_clicked(self, widget):
        dialog = Gtk.FileChooserDialog(
            title="게임 설치 폴더 선택",
            parent=self,
            action=Gtk.FileChooserAction.SELECT_FOLDER,
        )
        dialog.add_buttons(
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL, "선택", Gtk.ResponseType.OK
        )

        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            selected_path = dialog.get_filename()
            dll_path = os.path.join(selected_path, self.fsr_dll_filename)

            if os.path.isdir(selected_path) and os.path.exists(dll_path):
                self.game_path_entry.set_text(selected_path)
                if self.latest_fsr_download_url: 
                    self.fsr_install_button.set_sensitive(True)
            else:
                self.game_path_entry.set_text("")
                self.fsr_install_button.set_sensitive(False)
                self.show_message_dialog("오류", "FSR 미지원 게임입니다. 'amd_fidelityfx_dx12.dll' 파일을 찾을 수 없습니다.", Gtk.MessageType.ERROR)
        dialog.destroy()

    def on_install_fsr_clicked(self, widget):
        game_path = self.game_path_entry.get_text()

        if not game_path or not os.path.isdir(game_path):
            self.show_message_dialog("오류", "유효한 게임 설치 폴더를 선택해주세요.", Gtk.MessageType.ERROR)
            return
        
        if not self.latest_fsr_download_url:
            self.show_message_dialog("오류", "최신 FSR DLL 다운로드 URL을 가져올 수 없습니다. 다시 시도하거나 인터넷 연결을 확인해주세요.", Gtk.MessageType.ERROR)
            return

        # Disable install button to prevent multiple clicks
        self.fsr_install_button.set_sensitive(False)

        # Create and show progress dialog
        self.progress_dialog = Gtk.Dialog(
            title="FSR 설치 진행 중",
            parent=self,
            flags=Gtk.DialogFlags.MODAL
        )
        self.progress_dialog.set_default_size(300, 100)
        self.progress_dialog.set_resizable(False)

        dialog_vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        dialog_vbox.set_border_width(10)
        self.progress_dialog.get_content_area().add(dialog_vbox)

        self.progress_label = Gtk.Label(label="다운로드 중...")
        dialog_vbox.pack_start(self.progress_label, False, False, 0)

        self.progress_bar = Gtk.ProgressBar()
        dialog_vbox.pack_start(self.progress_bar, False, False, 0)
        
        self.progress_dialog.show_all()

        # Start installation in a separate thread
        install_thread = threading.Thread(
            target=self._perform_fsr_installation,
            args=(game_path, self.latest_fsr_download_url, self.latest_fsr_version)
        )
        install_thread.start()

    def _perform_fsr_installation(self, game_path, download_url, version_name):
        installation_successful = False
        try:
            # 1. Download the DLL
            response = requests.get(download_url, stream=True, timeout=10)
            response.raise_for_status()
            total_size = int(response.headers.get('content-length', 0))
            bytes_downloaded = 0
            
            temp_dll_path = os.path.join("/tmp", self.fsr_dll_filename)
            with open(temp_dll_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    bytes_downloaded += len(chunk)
                    if total_size > 0:
                        progress = bytes_downloaded / total_size
                        GLib.idle_add(self._update_progress_bar, progress, "다운로드 중...")

            # 2. Backup existing DLL
            existing_dll_path = os.path.join(game_path, self.fsr_dll_filename)
            if os.path.exists(existing_dll_path):
                backup_path = existing_dll_path + ".bak"
                if os.path.exists(backup_path):
                    os.remove(backup_path)
                os.rename(existing_dll_path, backup_path)
                print(f"Backed up existing DLL to {backup_path}")
                GLib.idle_add(self._update_progress_bar, 0.9, "기존 파일 백업 중...")

            # 3. Copy the new DLL
            shutil.copy(temp_dll_path, game_path)
            print(f"Copied {self.fsr_dll_filename} to {game_path}")
            GLib.idle_add(self._update_progress_bar, 0.95, "새 파일 복사 중...")

            # 4. Clean up temporary file
            os.remove(temp_dll_path)
            print(f"Removed temporary file {temp_dll_path}")
            GLib.idle_add(self._update_progress_bar, 1.0, "설치 완료!")

            installation_successful = True
        except requests.exceptions.RequestException as e:
            print(f"Network or download error during FSR installation: {e}")
            GLib.idle_add(self._on_installation_complete, False, f"네트워크 오류 또는 다운로드 실패: {e}")
        except Exception as e:
            print(f"Error during FSR installation: {e}")
            GLib.idle_add(self._on_installation_complete, False, f"FSR 설치 중 오류가 발생했습니다: {e}. 자세한 내용은 콘솔을 확인해주세요.")
        
        if installation_successful:
            GLib.idle_add(self._on_installation_complete, True, f"{version_name} 설치가 완료되었습니다!")

    def _update_progress_bar(self, progress, text):
        """Callback to update progress bar and label from background thread."""
        self.progress_bar.set_fraction(progress)
        self.progress_label.set_text(text)
        return False # Return False to remove the source after one call

    def _on_installation_complete(self, success, message):
        """Callback when installation thread completes."""
        self.progress_dialog.destroy() # Close the progress dialog
        self.fsr_install_button.set_sensitive(True) # Re-enable install button

        if success:
            self.show_message_dialog("설치 완료", message, Gtk.MessageType.INFO)
        else:
            self.show_message_dialog("설치 실패", message, Gtk.MessageType.ERROR)
        return False # Return False to remove the source

    def show_message_dialog(self, title, message, message_type):
        dialog = Gtk.MessageDialog(
            parent=self,
            flags=0,
            message_type=message_type,
            buttons=Gtk.ButtonsType.OK,
            text=title,
        )
        dialog.format_secondary_text(message)
        dialog.run()
        dialog.destroy()

def main():
    win = FSRChangerWindow()
    win.connect("destroy", Gtk.main_quit)
    win.show_all()
    Gtk.main()

if __name__ == "__main__":
    main()