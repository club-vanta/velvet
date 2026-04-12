resource "cloudflare_pages_project" "velvet" {
  account_id        = var.cloudflare_account_id
  name              = "velvet"
  production_branch = "main"

  source = {
    type = "github"
    config = {
      owner                         = "club-vanta"
      repo_name                     = "velvet"
      production_branch             = "main"
      pr_comments_enabled           = true
      production_deployments_enabled = true
      preview_deployment_setting    = "all"
    }
  }

  build_config = {
    build_command   = "npm run build"
    destination_dir = "dist"
    build_caching   = true
  }

  deployment_configs = {
    production = {
      environment_variables = {
        VITE_API_BASE_URL = "https://api-alter-tracker.${var.cloudflare_domain}"
      }
    }
    preview = {
      environment_variables = {
        VITE_API_BASE_URL = "https://api-alter-tracker.${var.cloudflare_domain}"
      }
    }
  }
}
