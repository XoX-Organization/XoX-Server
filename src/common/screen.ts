/**
 * A screen is a component to switch between different views.
 */
export default interface Screen {
    /**
     * Show the screen.
     */
    show(): Promise<void>
}
