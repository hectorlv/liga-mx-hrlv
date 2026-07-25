import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { Match, Player, TeamSide } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import {
  readImageFromClipboard,
  uploadPlayerImage,
} from '../utils/playerImageUpload';

export interface PlayerCreatedDetail {
  side: TeamSide;
  player: Player;
  players: Player[];
}

@customElement('player-registration-dialog')
export class PlayerRegistrationDialog extends LitElement {
  static override readonly styles = css`
    .dialog-form {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 8px;
    }

    @media (min-width: 600px) {
      .dialog-form {
        grid-template-columns: 1fr 1fr;
      }

      .full-width {
        grid-column: 1 / -1;
      }
    }

    .image-input-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .image-paste-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 180px;
      border: 2px dashed var(--md-sys-color-outline);
      border-radius: 16px;
      padding: 16px;
      background: var(--md-sys-color-surface-container-low);
      color: var(--md-sys-color-on-surface-variant);
      text-align: center;
      cursor: pointer;
      outline: none;
    }

    .image-paste-zone:focus {
      border-color: var(--md-sys-color-primary);
      box-shadow: 0 0 0 3px rgba(0, 103, 192, 0.12);
    }

    .image-paste-zone.has-image {
      padding: 8px;
      border-style: solid;
    }

    .image-preview {
      max-width: 100%;
      max-height: 220px;
      border-radius: 12px;
      object-fit: contain;
    }

    .image-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .image-help,
    .image-error {
      margin: 0;
      font-size: 0.85rem;
    }

    .image-help {
      color: var(--md-sys-color-on-surface-variant);
    }

    .image-error {
      color: var(--md-sys-color-error);
    }
  `;

  @property({ type: Object }) match: Match | null = null;
  @property({ type: String }) side: TeamSide | null = null;
  @property({ type: Array }) players: Player[] = [];
  @property({ type: Boolean }) isAdmin = false;
  @query('#dialogAddPlayer') private dialog!: MdDialog;
  @query('#newPlayerName') private newPlayerNameField!: MdFilledTextField;
  @query('#newPlayerPosition')
  private newPlayerPositionField!: MdFilledSelect;
  @query('#newPlayerNumber') private newPlayerNumberField!: MdFilledTextField;
  @query('#newPlayerBirthDate')
  private newPlayerBirthDateField!: MdFilledTextField;
  @query('#newPlayerFullName')
  private newPlayerFullNameField!: MdFilledTextField;
  @query('#newPlayerNationality')
  private newPlayerNationalityField!: MdFilledTextField;

  @state() private pastedImageBlob: Blob | null = null;
  @state() private pastedImagePreviewUrl = '';
  @state() private isUploadingImage = false;
  @state() private isReadingClipboardImage = false;
  @state() private imageError = '';

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._revokePreviewUrl();
  }

  override render() {
    const sideLabel = this.side === 'local' ? 'local' : 'visitante';

    return html`
      <md-dialog
        id="dialogAddPlayer"
        type="modal"
        @closed=${this._onDialogClosed}
      >
        <div slot="headline">Agregar jugador ${sideLabel}</div>
        <div slot="content" class="dialog-form">
          <md-filled-text-field
            id="newPlayerName"
            label="Nombre corto"
            required
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerNumber"
            label="Número de jersey"
            type="number"
            required
          ></md-filled-text-field>
          <md-filled-select
            id="newPlayerPosition"
            label="Posición"
            class="full-width"
          >
            <md-select-option value="Portero"
              ><div slot="headline">Portero</div></md-select-option
            >
            <md-select-option value="Defensa"
              ><div slot="headline">Defensa</div></md-select-option
            >
            <md-select-option value="Medio"
              ><div slot="headline">Medio</div></md-select-option
            >
            <md-select-option value="Delantero"
              ><div slot="headline">Delantero</div></md-select-option
            >
          </md-filled-select>
          <md-filled-text-field
            id="newPlayerFullName"
            label="Nombre Completo"
            class="full-width"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerNationality"
            label="Nacionalidad"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerBirthDate"
            label="Nacimiento"
            type="date"
          ></md-filled-text-field>
          <div class="image-input-section full-width">
            <div
              class="image-paste-zone ${
                this.pastedImagePreviewUrl ? 'has-image' : ''
              }"
              tabindex="0"
              role="button"
              @paste=${this._handleImagePaste}
              title="Haz click aquí y pega una imagen con Ctrl+V o Cmd+V"
            >
              ${
                this.pastedImagePreviewUrl
                  ? html`<img
                      class="image-preview"
                      src=${this.pastedImagePreviewUrl}
                      alt="Vista previa de la foto del jugador"
                    />`
                  : html`<div>
                      <md-icon>content_paste</md-icon>
                      <p>Pega aquí la foto del jugador</p>
                      <p class="image-help">
                        En escritorio usa Ctrl+V o Cmd+V. En móvil usa el botón
                        Leer portapapeles.
                      </p>
                    </div>`
              }
            </div>
            <div class="image-actions">
              <p class=${this.imageError ? 'image-error' : 'image-help'}>
                ${
                  this.imageError ||
                  'La imagen se convertirá a JPEG y se subirá al guardar.'
                }
              </p>
              ${
                this.pastedImagePreviewUrl
                  ? html`
                      <md-outlined-button @click=${this._clearPastedImage}>
                        Quitar imagen
                      </md-outlined-button>
                    `
                  : null
              }
              <md-outlined-button
                @click=${this._readImageFromClipboard}
                ?disabled=${
                  this.isReadingClipboardImage || this.isUploadingImage
                }
              >
                <md-icon slot="icon">content_paste_go</md-icon>
                ${
                  this.isReadingClipboardImage
                    ? 'Leyendo...'
                    : 'Leer portapapeles'
                }
              </md-outlined-button>
            </div>
          </div>
        </div>
        <div slot="actions">
          <md-outlined-button
            @click=${this._cancel}
            ?disabled=${this.isUploadingImage}
            >Cancelar</md-outlined-button
          >
          <md-filled-button
            @click=${this._save}
            ?disabled=${this.isUploadingImage}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  /** Opens a fresh registration form once the host has supplied its team. */
  open() {
    this._resetForm();
    void this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<MdDialog>('#dialogAddPlayer')
        ?.show();
    });
  }

  private _resetForm() {
    if (this.newPlayerNameField) this.newPlayerNameField.value = '';
    if (this.newPlayerPositionField) this.newPlayerPositionField.value = '';
    if (this.newPlayerNumberField) {
      this.newPlayerNumberField.value = '';
      this.newPlayerNumberField.setCustomValidity('');
    }
    if (this.newPlayerFullNameField) this.newPlayerFullNameField.value = '';
    if (this.newPlayerNationalityField)
      this.newPlayerNationalityField.value = '';
    if (this.newPlayerBirthDateField) this.newPlayerBirthDateField.value = '';
    this._clearPastedImage();
    this.imageError = '';
    this.isUploadingImage = false;
    this.isReadingClipboardImage = false;
  }

  private _cancel() {
    this._resetForm();
    this.dialog?.close();
  }

  private _onDialogClosed() {
    this.dispatchEvent(
      new CustomEvent('player-registration-dialog-closed', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _teamKey() {
    const teamName =
      this.side === 'local'
        ? this.match?.local || ''
        : this.match?.visitante || '';
    return teamName.replaceAll('.', '');
  }

  private async _save() {
    if (!this.isAdmin || !this.match || !this.side) return;

    const name = this.newPlayerNameField?.value?.trim();
    const position = this.newPlayerPositionField?.value?.trim();
    const number = Number(this.newPlayerNumberField?.value);
    const birthDateInput = this.newPlayerBirthDateField?.value || '';
    const birthDate = birthDateInput.includes('-')
      ? birthDateInput.split('-').reverse().join('/')
      : birthDateInput;
    const fullName = this.newPlayerFullNameField?.value?.trim() || '';
    const nationality = this.newPlayerNationalityField?.value?.trim() || '';

    if (!name || !position || Number.isNaN(number)) {
      this.newPlayerNumberField?.setCustomValidity(
        Number.isNaN(number) ? 'Número inválido' : '',
      );
      this.newPlayerNumberField?.reportValidity();
      return;
    }
    if (this.players.some(player => player.number === number)) {
      this.newPlayerNumberField?.setCustomValidity(
        'Ese número ya está registrado en este equipo',
      );
      this.newPlayerNumberField?.reportValidity();
      return;
    }
    this.newPlayerNumberField?.setCustomValidity('');

    let imgSrc = '';
    if (this.pastedImageBlob) {
      this.isUploadingImage = true;
      this.imageError = '';
      try {
        imgSrc = await uploadPlayerImage(
          this.pastedImageBlob,
          this._teamKey(),
          number,
        );
      } catch (error) {
        console.error('Error uploading player image:', error);
        this.imageError =
          'No fue posible subir la imagen. Revisa las reglas de Storage e inténtalo de nuevo.';
        this.isUploadingImage = false;
        return;
      }
    }

    const player: Player = {
      name,
      position,
      number,
      imgSrc,
      birthDate,
      fullName,
      nationality,
    };
    const players = [...this.players, player].sort(
      (a, b) => a.number - b.number,
    );
    this.dispatchEvent(
      dispatchEventMatchUpdated({ [`/players/${this._teamKey()}`]: players }),
    );
    this.dispatchEvent(
      new CustomEvent<PlayerCreatedDetail>('player-created', {
        detail: { side: this.side, player, players },
        bubbles: true,
        composed: true,
      }),
    );
    this._cancel();
  }

  private _handleImagePaste(event: ClipboardEvent) {
    const imageItem = event.clipboardData?.items
      ? Array.from(event.clipboardData.items).find(item =>
          item.type.startsWith('image/'),
        )
      : null;
    if (!imageItem) {
      this.imageError = 'El portapapeles no contiene una imagen.';
      return;
    }
    const blob = imageItem.getAsFile();
    if (!blob) {
      this.imageError = 'No fue posible leer la imagen pegada.';
      return;
    }
    event.preventDefault();
    this.imageError = '';
    this._setPastedImage(blob);
  }

  private async _readImageFromClipboard() {
    this.isReadingClipboardImage = true;
    this.imageError = '';
    try {
      this._setPastedImage(await readImageFromClipboard());
    } catch (error) {
      this.imageError =
        error instanceof Error
          ? error.message
          : 'No fue posible leer la imagen del portapapeles.';
    } finally {
      this.isReadingClipboardImage = false;
    }
  }

  private _setPastedImage(blob: Blob) {
    this._revokePreviewUrl();
    this.pastedImageBlob = blob;
    this.pastedImagePreviewUrl = URL.createObjectURL(blob);
  }

  private _clearPastedImage = () => {
    this._revokePreviewUrl();
    this.pastedImageBlob = null;
  };

  private _revokePreviewUrl() {
    if (!this.pastedImagePreviewUrl) return;
    URL.revokeObjectURL(this.pastedImagePreviewUrl);
    this.pastedImagePreviewUrl = '';
  }
}
