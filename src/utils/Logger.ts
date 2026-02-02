class Logger {
  // Le flag est statique : il est partagé par toute l'application
  static isDebugMode = true;

  /**
   * Active ou désactive le mode debug
   */
  static toggleDebug(value: boolean) {
    this.isDebugMode = value;
    const state = value ? "ACTIVÉ" : "DÉSACTIVÉ";
    // Le %c permet de mettre du CSS dans la console Chrome/Firefox !
    console.log(
      `%c[Logger] Mode Debug ${state}`,
      "color: white; background: #007bff; padding: 2px 5px; border-radius: 3px;",
    );
  }

  /**
   * Log standard (toujours visible)
   */
  static info(message: string, ...args: unknown[]) {
    console.log(
      `%c[INFO] ${message}`,
      "color: #00C851; font-weight: bold;",
      ...args,
    );
  }

  /**
   * Log de debug (visible uniquement si isDebugMode = true)
   * Utile pour suivre un paquet précis : Logger.debug("Packet moved", packet.id)
   */
  static debug(message: string, ...args: unknown[]) {
    if (!this.isDebugMode) return;
    console.debug(`%c[DEBUG] ${message}`, "color: #33b5e5;", ...args);
  }

  /**
   * Log d'erreur (toujours visible et rouge)
   */
  static error(message: string, ...args: unknown[]) {
    console.error(
      `%c[ERROR] ${message}`,
      "color: #ff4444; font-weight: bold;",
      ...args,
    );
  }
}

export default Logger;
