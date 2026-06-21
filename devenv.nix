{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    nodejs_24
    pre-commit
  ];

  languages.opentofu = {
    enable = true;
  };

  scripts = {
    tf-plan = {
      exec = "cd infra && tofu plan";
      description = "Preview infra changes";
    };

    tf-apply = {
      exec = "cd infra && tofu apply";
      description = "Apply infra changes";
    };
  };

  enterShell = ''
    echo ""
    echo "  🪡  Velvet - Dev Environment"
    echo ""
    ${pkgs.gnused}/bin/sed -e 's| |••|g' -e 's|=| |' <<EOF | ${pkgs.util-linuxMinimal}/bin/column -t | ${pkgs.gnused}/bin/sed -e 's|^|  |' -e 's|••| |g'
    ${lib.generators.toKeyValue {} (lib.mapAttrs (name: value: value.description) config.scripts)}
    EOF
    echo ""
  '';
}
