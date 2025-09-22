import json
import os
from datetime import datetime
from python.helpers.api import ApiHandler
from flask import request

class WorkspaceDesigns(ApiHandler):
    """
    API endpoints for the Designs tab - HTML web pages and applications.
    
    CLEAN IMPLEMENTATION:
    - GET: Load HTML designs from /outputs/designs/ 
    - DELETE: Remove specific design files
    - Supports both single files and app folders
    """

    @classmethod
    def requires_auth(cls) -> bool:
        return False

    @classmethod
    def requires_csrf(cls) -> bool:
        return False

    @classmethod
    def get_methods(cls):
        return ["GET", "DELETE"]

    async def process(self, input, request):
        method = request.method
        
        if method == "GET":
            return await self._get_designs()
        elif method == "DELETE":
            return await self._delete_designs(request)
        else:
            return {"error": "Method not allowed"}

    async def _get_designs(self):
        """Load all HTML designs from /outputs/designs/"""
        designs = []
        designs_dir = "/a0/outputs/designs"
        
        try:
            if os.path.exists(designs_dir):
                print(f"[workspace_designs] Loading designs from {designs_dir}")
                
                # Process single HTML files
                for filename in os.listdir(designs_dir):
                    if filename.endswith('.html'):
                        file_path = os.path.join(designs_dir, filename)
                        if os.path.isfile(file_path):
                            design = self._create_design_object(filename, file_path, "single_file")
                            if design:
                                designs.append(design)
                
                # Process app folders (directories with HTML files)
                for item in os.listdir(designs_dir):
                    item_path = os.path.join(designs_dir, item)
                    if os.path.isdir(item_path):
                        # Find main HTML file in app folder
                        html_files = [f for f in os.listdir(item_path) if f.endswith('.html')]
                        if html_files:
                            main_file = "index.html" if "index.html" in html_files else html_files[0]
                            main_path = os.path.join(item_path, main_file)
                            design = self._create_design_object(f"{item}/{main_file}", main_path, "app_folder", {
                                "app_folder": item,
                                "main_file": main_file,
                                "total_files": len(html_files),
                                "files": html_files
                            })
                            if design:
                                designs.append(design)
                
                print(f"[workspace_designs] Found {len(designs)} designs")
            else:
                print(f"[workspace_designs] Designs directory {designs_dir} does not exist")
                
        except Exception as e:
            print(f"[workspace_designs] Error loading designs: {e}")
        
        # Sort by created_at (newest first)
        designs.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {
            "workspace": {
                "designs": designs
            }
        }

    def _create_design_object(self, filename, file_path, design_format, extra_metadata=None):
        """Create a standardized design object"""
        try:
            file_stat = os.stat(file_path)
            created_at = datetime.fromtimestamp(file_stat.st_mtime)
            
            # Clean filename for title
            clean_name = filename.replace('.html', '').replace('_', ' ').replace('/', ' - ')
            title = clean_name.title()
            
            # Detect design type and technology
            design_type, category, technology = self._analyze_design(file_path, filename)
            
            design = {
                "id": filename.replace('.html', '').replace('/', '_'),
                "type": design_type,
                "title": title,
                "path": f"/outputs/designs/{filename}",
                "category": category,
                "technology": technology,
                "format": design_format,
                "created_at": created_at.isoformat(),
                "file_size": file_stat.st_size,
                "metadata": {
                    "source": "ghost_file_generator",
                    "format": design_format,
                    "technology": technology,
                    **(extra_metadata or {})
                }
            }
            
            return design
            
        except Exception as e:
            print(f"[workspace_designs] Error creating design object for {filename}: {e}")
            return None

    def _analyze_design(self, file_path, filename):
        """Analyze design file to determine type, category, and technology"""
        design_type = "webpage"
        category = "web"
        technology = "html"
        
        # Analyze filename
        filename_lower = filename.lower()
        if any(keyword in filename_lower for keyword in ["app", "application"]):
            design_type = "application"
            category = "app"
        elif any(keyword in filename_lower for keyword in ["component", "widget"]):
            design_type = "component"
            category = "component"
        elif any(keyword in filename_lower for keyword in ["dashboard", "admin"]):
            design_type = "dashboard"
            category = "app"
        elif any(keyword in filename_lower for keyword in ["landing", "home"]):
            design_type = "landing_page"
            category = "marketing"
        
        # Analyze file content for technology detection
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content_sample = f.read(3000).lower()  # First 3KB
                
            if "react" in content_sample or "jsx" in content_sample:
                technology = "react"
            elif "vue" in content_sample or "@vue" in content_sample:
                technology = "vue"
            elif "angular" in content_sample or "ng-" in content_sample:
                technology = "angular"
            elif "tailwind" in content_sample or "tailwindcss" in content_sample:
                technology = "tailwind"
            elif "bootstrap" in content_sample:
                technology = "bootstrap"
            elif "alpine" in content_sample or "x-data" in content_sample:
                technology = "alpine"
                
        except Exception as e:
            print(f"[workspace_designs] Could not analyze content of {filename}: {e}")
        
        return design_type, category, technology

    async def _delete_designs(self, request):
        """Delete design files (single or batch)"""
        try:
            # Get IDs from request (supports both single and batch)
            data = request.get_json() if request.is_json else {}
            design_ids = data.get('ids', [])
            
            # Also support single ID from query param
            single_id = request.args.get('id')
            if single_id:
                design_ids.append(single_id)
            
            if not design_ids:
                return {"error": "No design IDs provided"}, 400
            
            deleted = []
            errors = []
            designs_dir = "/a0/outputs/designs"
            
            for design_id in design_ids:
                try:
                    # Handle both single files and app folders
                    if '_' in design_id and design_id.count('_') > 0:
                        # Might be an app folder (format: appfolder_mainfile)
                        parts = design_id.split('_', 1)
                        if len(parts) == 2:
                            app_folder = parts[0]
                            app_path = os.path.join(designs_dir, app_folder)
                            if os.path.isdir(app_path):
                                # Delete entire app folder
                                import shutil
                                shutil.rmtree(app_path)
                                deleted.append({"id": design_id, "type": "app_folder", "path": app_folder})
                                print(f"[workspace_designs] Deleted app folder: {app_folder}")
                                continue
                    
                    # Handle single HTML file
                    html_file = f"{design_id}.html"
                    file_path = os.path.join(designs_dir, html_file)
                    
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        deleted.append({"id": design_id, "type": "single_file", "path": html_file})
                        print(f"[workspace_designs] Deleted file: {html_file}")
                    else:
                        errors.append(f"Design not found: {design_id}")
                        
                except Exception as e:
                    errors.append(f"Error deleting {design_id}: {str(e)}")
                    print(f"[workspace_designs] Error deleting {design_id}: {e}")
            
            result = {
                "deleted": deleted,
                "deleted_count": len(deleted)
            }
            
            if errors:
                result["errors"] = errors
                result["error_count"] = len(errors)
            
            return result
            
        except Exception as e:
            print(f"[workspace_designs] Delete operation failed: {e}")
            return {"error": f"Delete operation failed: {str(e)}"}, 500