import json
import os
from datetime import datetime
from python.helpers.api import ApiHandler
from flask import request

class WorkspaceCharts(ApiHandler):
    """
    API endpoints for loading charts and visualizations from the correct directory structure.
    
    FIXED: Properly separates workspace (charts) from designs tab
    - Workspace tab: /outputs/charts/ (data visualizations, charts, graphs)
    - Designs tab: /outputs/designs/ (web pages, UI components, designs)
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
            return await self._get_charts()
        elif method == "DELETE":
            return await self._delete_charts(request)
        else:
            return {"error": "Method not allowed - charts are created via chart_creator or visualization_generator tools"}

    async def _get_charts(self):
            # FIXED: Load ONLY from /outputs/charts/ for workspace tab
            charts = []
            
            # Primary charts directory - the CORRECT location
            charts_dir = "/a0/outputs/charts"
            
            try:
                if os.path.exists(charts_dir):
                    print(f"[workspace_charts] Loading charts from {charts_dir}")
                    for filename in os.listdir(charts_dir):
                        if filename.endswith('.html'):
                            # Get file stats
                            file_path = os.path.join(charts_dir, filename)
                            file_stat = os.stat(file_path)
                            created_at = datetime.fromtimestamp(file_stat.st_mtime)
                            
                            # Extract title from filename
                            title = filename.replace('.html', '').replace('_', ' ').title()
                            
                            # Determine chart type and category based on filename
                            viz_type = "chart"
                            category = "chart"
                            
                            # Smart type detection from filename
                            filename_lower = filename.lower()
                            if "table" in filename_lower:
                                viz_type = "table"
                                category = "table"
                            elif "meeting" in filename_lower:
                                viz_type = "meeting_summary"
                                category = "data"
                            elif "pie" in filename_lower:
                                viz_type = "pie_chart"
                                category = "chart"
                            elif "line" in filename_lower:
                                viz_type = "line_chart"
                                category = "chart"
                            elif "bar" in filename_lower:
                                viz_type = "bar_chart"
                                category = "chart"
                            elif "candlestick" in filename_lower:
                                viz_type = "candlestick"
                                category = "chart"
                            elif "heatmap" in filename_lower:
                                viz_type = "heatmap"
                                category = "chart"
                            elif "bubble" in filename_lower:
                                viz_type = "bubble"
                                category = "chart"
                            elif "scatter" in filename_lower:
                                viz_type = "scatter"
                                category = "chart"
                            elif "mermaid" in filename_lower:
                                viz_type = "mermaid"
                                category = "diagram"
                            elif any(keyword in filename_lower for keyword in ["data", "analytics", "report"]):
                                category = "data"
                            
                            # Create chart object
                            chart = {
                                "id": filename.replace('.html', ''),
                                "type": viz_type,
                                "title": title,
                                "path": f"/outputs/charts/{filename}",  # Correct web path
                                "category": category,
                                "created_at": created_at.isoformat(),
                                "interactive": True,
                                "file_type": "html",
                                "metadata": {
                                    "source": "chart_creator_or_visualization_generator",
                                    "interactive": True,
                                    "directory": "charts"
                                }
                            }
                            charts.append(chart)
                            
                    print(f"[workspace_charts] Found {len(charts)} charts in {charts_dir}")
                            
            except Exception as e:
                print(f"[workspace_charts] Error loading charts from {charts_dir}: {e}")
            
            # LEGACY CLEANUP: Also check legacy visualization folder and MOVE files to correct location
            legacy_viz_dir = "/a0/outputs/visualizations"
            if os.path.exists(legacy_viz_dir):
                print(f"[workspace_charts] Found legacy visualization folder, checking for files to migrate...")
                try:
                    legacy_files = os.listdir(legacy_viz_dir)
                    if legacy_files:
                        print(f"[workspace_charts] Found {len(legacy_files)} files in legacy folder")
                        # Ensure charts directory exists
                        os.makedirs(charts_dir, exist_ok=True)
                        
                        for filename in legacy_files:
                            if filename.endswith('.html'):
                                legacy_path = os.path.join(legacy_viz_dir, filename)
                                new_path = os.path.join(charts_dir, filename)
                                
                                # Move file from legacy to correct location
                                try:
                                    os.rename(legacy_path, new_path)
                                    print(f"[workspace_charts] Migrated {filename} from visualizations/ to charts/")
                                    
                                    # Add the migrated file to our charts list
                                    file_stat = os.stat(new_path)
                                    created_at = datetime.fromtimestamp(file_stat.st_mtime)
                                    title = filename.replace('.html', '').replace('_', ' ').title()
                                    
                                    # Determine type for migrated file
                                    viz_type = "chart"
                                    category = "chart"
                                    filename_lower = filename.lower()
                                    if "pie" in filename_lower:
                                        viz_type = "pie_chart"
                                    elif "line" in filename_lower:
                                        viz_type = "line_chart"
                                    elif "bar" in filename_lower:
                                        viz_type = "bar_chart"
                                    elif "table" in filename_lower:
                                        viz_type = "table"
                                        category = "table"
                                    
                                    migrated_chart = {
                                        "id": filename.replace('.html', ''),
                                        "type": viz_type,
                                        "title": title,
                                        "path": f"/outputs/charts/{filename}",
                                        "category": category,
                                        "created_at": created_at.isoformat(),
                                        "interactive": True,
                                        "file_type": "html",
                                        "metadata": {
                                            "source": "migrated_from_visualizations",
                                            "interactive": True,
                                            "directory": "charts"
                                        }
                                    }
                                    charts.append(migrated_chart)
                                    
                                except Exception as move_error:
                                    print(f"[workspace_charts] Could not migrate {filename}: {move_error}")
                                    # If move fails, at least load it from legacy location
                                    file_stat = os.stat(legacy_path)
                                    created_at = datetime.fromtimestamp(file_stat.st_mtime)
                                    title = filename.replace('.html', '').replace('_', ' ').title()
                                    
                                    legacy_chart = {
                                        "id": filename.replace('.html', ''),
                                        "type": "chart",
                                        "title": title + " (Legacy)",
                                        "path": f"/outputs/visualizations/{filename}",  # Legacy path
                                        "category": "chart",
                                        "created_at": created_at.isoformat(),
                                        "interactive": True,
                                        "file_type": "html",
                                        "metadata": {
                                            "source": "legacy_visualizations_folder",
                                            "interactive": True,
                                            "directory": "visualizations_legacy",
                                            "needs_migration": True
                                        }
                                    }
                                    charts.append(legacy_chart)
                    
                        # Try to remove empty legacy directory
                        try:
                            remaining_files = os.listdir(legacy_viz_dir)
                            if not remaining_files:
                                os.rmdir(legacy_viz_dir)
                                print(f"[workspace_charts] Removed empty legacy visualizations directory")
                            else:
                                print(f"[workspace_charts] Legacy directory still has {len(remaining_files)} files")
                        except Exception as e:
                            print(f"[workspace_charts] Could not remove legacy directory: {e}")
                            
                except Exception as e:
                    print(f"[workspace_charts] Error during legacy migration: {e}")
            
            # Sort by created_at (newest first)
            charts.sort(key=lambda x: x["created_at"], reverse=True)
            
            print(f"[workspace_charts] Returning {len(charts)} total charts for workspace tab")
            
            # Return in Phantom Console expected format - ONLY charts for workspace tab
            return {
                "workspace": {
                    "visualizations": charts
                }
            }

    async def _delete_charts(self, request):
        """Delete chart files (single or batch)"""
        try:
            # Get IDs from request (supports both single and batch)
            data = request.get_json() if request.is_json else {}
            chart_ids = data.get('ids', [])
            
            # Also support single ID from query param
            single_id = request.args.get('id')
            if single_id:
                chart_ids.append(single_id)
            
            if not chart_ids:
                return {"error": "No chart IDs provided"}, 400
            
            deleted = []
            errors = []
            charts_dir = "/a0/outputs/charts"
            
            for chart_id in chart_ids:
                try:
                    # Look for HTML file
                    html_file = f"{chart_id}.html"
                    html_path = os.path.join(charts_dir, html_file)
                    
                    if os.path.exists(html_path):
                        os.remove(html_path)
                        deleted.append({"id": chart_id, "type": "chart", "path": html_file})
                        print(f"[workspace_charts] Deleted chart: {html_file}")
                        
                        # Also try to delete associated thumbnail
                        thumb_file = f"{chart_id}_thumb.png"
                        thumb_path = os.path.join(charts_dir, thumb_file)
                        if os.path.exists(thumb_path):
                            os.remove(thumb_path)
                            print(f"[workspace_charts] Deleted thumbnail: {thumb_file}")
                    else:
                        errors.append(f"Chart not found: {chart_id}")
                        
                except Exception as e:
                    errors.append(f"Error deleting {chart_id}: {str(e)}")
                    print(f"[workspace_charts] Error deleting {chart_id}: {e}")
            
            result = {
                "deleted": deleted,
                "deleted_count": len(deleted)
            }
            
            if errors:
                result["errors"] = errors
                result["error_count"] = len(errors)
            
            return result
            
        except Exception as e:
            print(f"[workspace_charts] Delete operation failed: {e}")
            return {"error": f"Delete operation failed: {str(e)}"}, 500