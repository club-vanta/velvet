data "cloudflare_zone" "club_vanta" {
  filter = {
    account_id = var.cloudflare_account_id
    name       = var.cloudflare_domain
  }
}

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

resource "cloudflare_pages_domain" "velvet" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.velvet.name
  name         = "velvet.${var.cloudflare_domain}"
}

resource "cloudflare_dns_record" "velvet" {
  zone_id = data.cloudflare_zone.club_vanta.id
  name    = "velvet"
  type    = "CNAME"
  content = cloudflare_pages_project.velvet.subdomain
  proxied = true
  ttl     = 1
}
