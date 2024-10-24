import ExpoModulesCore

public class TmsvisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Tmsvision")

    Function("getTheme") { () -> String in
      "system"
    }
  }
}
